// DSH host entry. Browser behavior lives in client/widget.js.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeMessageCost, computeTodayUsage, getPeakStatus } from './pricing.js'
import { createPricingStore } from './pricing-store.js'
import { createDialogueStore } from './dialogue-store.js'
import { createUsageLedgerStore } from './usage-ledger.js'
import { createConversationUsageStore } from './conversation-usage.js'
import { createConfigStore, validateConfigInput } from './config.js'
import { JSON_HEADERS, requireMethod, requireSameOrigin } from './http-security.js'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')

const IMAGE_CANDIDATES = [
  path.join(PACKAGE_ROOT, 'assets', 'DSniang1.png'),
  path.join(PACKAGE_ROOT, 'assets', 'DSniang02.png'),
]
const SIZE_FILE_CANDIDATES = [
  path.join(DSH_HOME, '.dshw-size.json'),
  path.join(DSH_HOME, 'profiles', 'web', '.dshw-size.json'),
]
const USAGE_FILE_CANDIDATES = [
  path.join(DSH_HOME, '.dshw-usage.json'),
  path.join(DSH_HOME, 'profiles', 'web', '.dshw-usage.json'),
]
const CONVERSATION_USAGE_FILE_CANDIDATES = [
  path.join(DSH_HOME, 'dsh-whale-conversations.json'),
  path.join(DSH_HOME, 'profiles', 'web', 'dsh-whale-conversations.json'),
]
const PRICING_FILE = path.join(DSH_HOME, 'dsh-whale-pricing.json')
const DIALOGUE_FILE = path.join(DSH_HOME, 'dsh-whale-dialogues.json')
const SOUND_SETS = {
  duck: {
    press: [path.join(PACKAGE_ROOT, 'assets', 'Ya1.mp3')],
    release: [path.join(PACKAGE_ROOT, 'assets', 'Ya2.mp3')],
  },
  fx1: {
    press: [path.join(PACKAGE_ROOT, 'assets', 'D1.mp3')],
    release: [path.join(PACKAGE_ROOT, 'assets', 'D2.mp3')],
  },
}
function soundSetFromUrl(url) {
  try {
    const query = String(url || '').split('?')[1] || ''
    const match = /(?:^|&)set=([^&]+)/.exec(query)
    return match ? decodeURIComponent(match[1]) : ''
  } catch {
    return ''
  }
}

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const BALANCE_TTL_MS = 25000
const RUA_GIF_CANDIDATES = [path.join(PACKAGE_ROOT, 'assets', 'rua.gif')]

let widgetScript = null
function loadWidgetScript() {
  if (widgetScript === null) {
    widgetScript = fs.readFileSync(path.join(PACKAGE_ROOT, 'client', 'widget.js'), 'utf8')
  }
  return widgetScript
}

const name = 'dsh-whale-widget'
const inject = ['webServer', 'credentials']

function apply(ctx) {
    let imageBytes = null
    let balanceCache = null
    let balanceInFlight = null
    let gifBytes = null
    // 按 (session.id, turn) 分桶，避免并行主会话和子智能体串账。
    let turnAggs = new Map()
    let lastTurn = null // Most recently completed DSH turn across sessions.
    let lastTurnSeq = 0
    let usageSeq = 0
    const usageStreams = new Set()
    const disposers = []
    const pricingStore = createPricingStore(PRICING_FILE)
    const dialogueStore = createDialogueStore(DIALOGUE_FILE)
    const conversationStore = createConversationUsageStore(CONVERSATION_USAGE_FILE_CANDIDATES)
    const reportedUnknownModels = new Set()

    function sessionMeta(session) {
      const header = session && session.header && typeof session.header === 'object' ? session.header : {}
      return {
        id: session && session.id ? String(session.id) : '',
        cwd: typeof header.cwd === 'string' ? header.cwd : '',
        parentSessionId: typeof header.parentSession === 'string' ? header.parentSession : '',
        createdAt: Number(header.createdAt) || Date.now(),
      }
    }

    function usagePayload(sessionId = '') {
      return { ok: true, seq: usageSeq, ...conversationStore.snapshot(sessionId) }
    }

    function writeUsageEvent(stream) {
      try {
        stream.res.write('event: usage\n')
        stream.res.write('data: ' + JSON.stringify(usagePayload(stream.sessionId)) + '\n\n')
      } catch {
        usageStreams.delete(stream)
      }
    }

    function broadcastUsage() {
      usageSeq++
      for (const stream of usageStreams) writeUsageEvent(stream)
    }

    function finalizeTurn(sessionId) {
      const agg = turnAggs.get(sessionId)
      if (agg && agg.tokens.total > 0) {
        const unknownModels = [...agg.unknownModels]
        lastTurn = {
          sessionId,
          turn: agg.turn,
          amount: unknownModels.length ? null : agg.cost,
          knownAmount: agg.cost,
          tokens: agg.tokens.total,
          tokenDetails: agg.tokens,
          reasoningTokens: agg.tokens.reasoning,
          unknownModels,
          models: [...agg.models],
          pricingStatus: unknownModels.length ? 'unknown-model' : 'ok',
          ts: agg.lastTs,
        }
        lastTurnSeq++
        const recorded = conversationStore.recordTurn(agg.meta, {
          turn: agg.turn,
          amount: lastTurn.amount,
          knownAmount: agg.cost,
          tokens: agg.tokens,
          unknownModels,
          models: [...agg.models],
          ts: agg.lastTs,
        })
        if (!recorded.persisted) console.warn('[dsh-whale-widget] conversation usage is memory-only for this turn')
        broadcastUsage()
      }
      turnAggs.delete(sessionId)
    }
    // 监听会话事件流：assistant/message 携带每步真实 usage，按 (session,turn) 聚合；
    // turn/end 时结算该会话本轮并写入 lastTurn
    function handleSessionEvent(session, event) {
      try {
        const meta = sessionMeta(session)
        const sessionId = meta.id || 'unassigned'
        if (!meta.id) meta.id = sessionId
        conversationStore.observeSession(meta)
        const type = event && event.type
        const d = event && event.data
        if (!d || typeof d !== 'object') return
        if (type === 'turn/end') {
          finalizeTurn(sessionId)
          return
        }
        if (type !== 'assistant/message') return
        const turn = Number(d.turn)
        const usage = d.usage
        if (!usage || typeof usage !== 'object' || !isFinite(turn)) return
        let agg = turnAggs.get(sessionId)
        if (!agg || agg.turn !== turn) {
          if (agg) finalizeTurn(sessionId)
          agg = {
            turn,
            cost: 0,
            tokens: { input: 0, cacheRead: 0, output: 0, reasoning: 0, total: 0 },
            unknownModels: new Set(),
            models: new Set(),
            lastTs: Date.now(),
            meta,
          }
          turnAggs.set(sessionId, agg)
        }
        const model = d.message && d.message.source ? d.message.source.model : ''
        if (model) agg.models.add(String(model).slice(0, 160))
        const pricing = pricingStore.load()
        const calculated = computeMessageCost(usage, model, Math.floor(Date.now() / 1000), pricing.config)
        agg.tokens.input += calculated.inputTokens
        agg.tokens.cacheRead += calculated.cacheReadTokens
        agg.tokens.output += calculated.outputTokens
        agg.tokens.reasoning += calculated.reasoningTokens
        agg.tokens.total += calculated.tokens
        agg.meta = meta
        if (calculated.amount === null) {
          agg.unknownModels.add(calculated.unknownModel)
          if (!reportedUnknownModels.has(calculated.unknownModel)) {
            reportedUnknownModels.add(calculated.unknownModel)
            console.warn('[dsh-whale-widget] no price configured for model:', calculated.unknownModel)
          }
        } else {
          agg.cost += calculated.amount
        }
        agg.lastTs = Date.now()
      } catch (err) {}
    }

    // 监听所有会话的追加事件；按会话 id 分桶，turn/end 时结算该会话本轮
    disposers.push(ctx.on('session/event', (session, event) => {
      handleSessionEvent(session, event)
    }))
    // 会话销毁时清理残留聚合，避免内存泄漏
    disposers.push(ctx.on('session/disposed', (session) => {
      if (session && session.id) finalizeTurn(String(session.id))
    }))

    function loadGif() {
      if (gifBytes) return gifBytes
      for (const p of RUA_GIF_CANDIDATES) {
        try {
          const bytes = fs.readFileSync(p)
          if (bytes && bytes.length > 0) {
            gifBytes = bytes
            return bytes
          }
        } catch (err) {}
      }
      throw new Error('rua gif not found')
    }

    function loadImage() {
      if (imageBytes) return imageBytes
      for (const p of IMAGE_CANDIDATES) {
        try {
          const bytes = fs.readFileSync(p)
          if (bytes && bytes.length > 0) {
            imageBytes = bytes
            return bytes
          }
        } catch (err) {}
      }
      throw new Error('whale image not found')
    }

    function pickBalanceInfo(infos) {
      if (!Array.isArray(infos) || infos.length === 0) return null
      const num = (x) => (x && x.total_balance !== undefined ? Number(x.total_balance) : NaN)
      return (
        infos.find((x) => x && x.currency === 'CNY' && num(x) > 0) ||
        infos.find((x) => num(x) > 0) ||
        infos.find((x) => x && x.currency === 'CNY') ||
        infos[0]
      )
    }

    async function fetchBalance() {
      let cred
      try {
        cred = await ctx.credentials.resolve('DEEPSEEK_API_KEY')
      } catch (err) {
        return { ok: false, code: 'NO_KEY', error: '凭据读取失败: ' + String((err && err.message) || err).slice(0, 160) }
      }
      if (!cred) {
        return { ok: false, code: 'NO_KEY', error: '未配置 DEEPSEEK_API_KEY' }
      }
      let lastErr = null
      for (let attempt = 0; attempt < 2; attempt++) {
        let res
        try {
          res = await fetch(BALANCE_URL, {
            headers: { Authorization: 'Bearer ' + cred.value },
            signal: AbortSignal.timeout(20000),
          })
        } catch (err) {
          lastErr = err
          if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
          continue
        }
        if (!res.ok) {
          lastErr = new Error('HTTP ' + res.status)
          if (res.status < 500) break
          if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
          continue
        }
        let data
        try {
          data = await res.json()
        } catch (err) {
          return { ok: false, code: 'PARSE', error: '余额接口返回不是合法 JSON' }
        }
        const info = pickBalanceInfo(data && data.balance_infos)
        if (!info || info.total_balance === undefined) {
          return { ok: false, code: 'SHAPE', error: '余额接口返回结构异常' }
        }
        return {
          ok: true,
          totalBalance: Number(info.total_balance),
          currency: String(info.currency || 'CNY'),
          updatedAt: new Date().toISOString(),
        }
      }
      const transient = !(lastErr && /^HTTP 4\d\d/.test(lastErr.message))
      return {
        ok: false,
        code: 'HTTP',
        transient: transient,
        error: '余额接口请求失败: ' + String((lastErr && lastErr.message) || lastErr).slice(0, 200),
      }
    }

    async function fetchUsage() {
      let cred
      try {
        cred = await ctx.credentials.resolve('DEEPSEEK_PLATFORM_TOKEN')
      } catch (err) {
        return { error: 'platform cred resolve failed' }
      }
      if (!cred) return { error: 'no platform token' }
      const token = String(cred.value).replace(/^Bearer\s+/i, '')
      try {
        const now = new Date()
        const tz = -now.getTimezoneOffset() * 60
        const start = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000)
        const end = start + 86400
        const url = 'https://platform.deepseek.com/api/v0/usage/by_api_key/amount?start=' + start + '&end=' + end + '&tz=' + tz
        const res = await fetch(url, {
          headers: { Authorization: 'Bearer ' + token },
          signal: AbortSignal.timeout(15000),
        })
        if (!res.ok) return { error: 'http ' + res.status }
        const data = await res.json()
        const pricing = pricingStore.load()
        const u = computeTodayUsage(data, pricing.config)
        if (u && Number.isFinite(u.amount)) {
          return { amount: u.amount, tokens: u.tokens, pricingSource: pricing.source, pricingVerifiedAt: pricing.verifiedAt }
        }
        if (u && u.unknownModels && u.unknownModels.length) {
          return { code: 'UNKNOWN_MODEL', error: 'no price configured for platform usage model', tokens: u.tokens, unknownModels: u.unknownModels }
        }
        return { error: 'no usage' }
      } catch (err) {
        return { error: String((err && err.message) || err) }
      }
    }

    const usageStore = createUsageLedgerStore(USAGE_FILE_CANDIDATES)

    function normalizeUsageMode(m) {
      return m === 'token' ? 'token' : 'ledger'
    }

    async function getBalancePayload() {
      const payload = await fetchBalance()
      if (!payload.ok) return payload
      // 无论哪种模式，都先把余额观测记入账本（自动累积「鲸鱼记账」数据）
      const recorded = usageStore.record(Number(payload.totalBalance), payload.currency)
      const led = recorded.ledger
      if (!recorded.persisted) console.warn('[dsh-whale-widget] usage ledger could not be persisted')
      const cfg = readSizeConfig() || {}
      const mode = normalizeUsageMode(cfg.usageMode)
      const full = { ...payload }
      const pricing = pricingStore.load()
      full.peakStatus = getPeakStatus(Date.now() / 1000, pricing.config)
      full.isPeak = !!(full.peakStatus && full.peakStatus.isPeak)
      full.pricingSource = pricing.source
      full.pricingVerifiedAt = pricing.verifiedAt
      if (mode === 'ledger') {
        full.todayUsage = led.todayUsage
        full.usageMode = 'ledger'
        full.todayUsageSource = 'balance-estimate'
        full.todayTokens = null
        return full
      }
      // token：尝试平台令牌实时计算
      let cred = null
      try {
        cred = await ctx.credentials.resolve('DEEPSEEK_PLATFORM_TOKEN')
      } catch (err) {}
      if (cred) {
        const u = await fetchUsage()
        if (u && Number.isFinite(u.amount)) {
          full.todayUsage = u.amount
          full.usageMode = 'token'
          full.todayUsageSource = 'platform'
          full.todayTokens = u.tokens
          return full
        }
        if (u) {
          full.usageWarning = u.code || u.error
          full.todayTokens = Number.isFinite(u.tokens) ? u.tokens : null
          full.unknownModels = Array.isArray(u.unknownModels) ? u.unknownModels : []
        }
      } else {
        full.usageWarning = 'NO_PLATFORM_TOKEN'
      }
      // 无令牌或令牌失败：回落记账模式
      full.todayUsage = led.todayUsage
      full.usageMode = 'ledger'
      full.todayUsageSource = 'balance-estimate'
      if (full.todayTokens === undefined) full.todayTokens = null
      return full
    }

    function getBalance() {
      const now = Date.now()
      if (balanceCache && now - balanceCache.at < BALANCE_TTL_MS) {
        return Promise.resolve(balanceCache.payload)
      }
      if (balanceInFlight) return balanceInFlight
      balanceInFlight = getBalancePayload()
        .then((payload) => {
          if (payload.ok) {
            balanceCache = { at: now, payload }
            return payload
          }
          if (payload.transient && balanceCache) {
            // transient network/API blip: keep serving the last known balance
            return { ...balanceCache.payload, stale: true, error: payload.error }
          }
          if (!payload.transient) console.error('[whale-balance]', payload.code, payload.error)
          return payload
        })
        .catch((err) => ({
          ok: false,
          code: 'ERROR',
          error: '余额服务异常: ' + String((err && err.message) || err).slice(0, 200),
        }))
        .finally(() => {
          balanceInFlight = null
        })
      return balanceInFlight
    }

    const configStore = createConfigStore(SIZE_FILE_CANDIDATES)

    function readSizeConfig() {
      return configStore.read()
    }

    function readBody(req, maxBytes = 8192) {
      return new Promise((resolve, reject) => {
        const chunks = []
        let size = 0
        req.on('data', (c) => {
          size += c.length
          if (size > maxBytes) {
            reject(new Error('body too large'))
            req.destroy()
            return
          }
          chunks.push(c)
        })
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        req.on('error', reject)
      })
    }

    function sessionIdFromRequest(req) {
      try {
        const value = new URL(String(req.url || ''), 'http://127.0.0.1').searchParams.get('sessionId') || ''
        return value.slice(0, 200)
      } catch {
        return ''
      }
    }

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/image.png',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        try {
          const bytes = loadImage()
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store',
            'Content-Length': String(bytes.length),
          })
          res.end(bytes)
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('whale image unavailable: ' + String((err && err.message) || err))
        }
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/rua.gif',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        try {
          const bytes = loadGif()
          res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store',
            'Content-Length': String(bytes.length),
          })
          res.end(bytes)
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('rua gif unavailable: ' + String((err && err.message) || err))
        }
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/balance.json',
      handler: async (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        if (!requireSameOrigin(req, res)) return
        try {
          const payload = await getBalance()
          const status = payload.ok ? 200 : (payload.code === 'NO_KEY' ? 503 : 502)
          res.writeHead(status, JSON_HEADERS)
          res.end(JSON.stringify(payload))
        } catch (err) {
          res.writeHead(502, JSON_HEADERS)
          res.end(JSON.stringify({ ok: false, code: 'ERROR', error: String((err && err.message) || err).slice(0, 200) }))
        }
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/last-turn.json',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        if (!requireSameOrigin(req, res)) return
        // 返回最近一轮已完成的对话消耗；seq 递增供前端判断「新的一轮」
        const payload = lastTurn
          ? { ok: true, seq: lastTurnSeq, ...lastTurn }
          : { ok: true, seq: 0, turn: null, amount: null, tokens: null, ts: null }
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify(payload))
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/usage.json',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        if (!requireSameOrigin(req, res)) return
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify(usagePayload(sessionIdFromRequest(req))))
      },
    }))

    function pricingPayload() {
      const current = pricingStore.load()
      return {
        ok: true,
        config: current.config,
        source: current.source,
        verifiedAt: current.verifiedAt,
        hasBackup: pricingStore.hasBackup(),
        peakStatus: getPeakStatus(Date.now() / 1000, current.config),
      }
    }

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/pricing.json',
      handler: async (req, res) => {
        if (!requireMethod(req, res, ['GET', 'PUT', 'POST'])) return
        if (!requireSameOrigin(req, res)) return
        if (req.method === 'GET') {
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify(pricingPayload()))
          return
        }
        try {
          const parsed = JSON.parse(await readBody(req, 65536))
          let result
          if (req.method === 'PUT') {
            result = pricingStore.save(parsed && parsed.config ? parsed.config : parsed)
          } else if (parsed && parsed.action === 'restore-backup') {
            result = pricingStore.restoreBackup()
          } else if (parsed && parsed.action === 'reset-defaults') {
            result = pricingStore.resetToDefaults()
          } else {
            res.writeHead(400, JSON_HEADERS)
            res.end(JSON.stringify({ ok: false, code: 'INVALID_ACTION', error: '未知的价格操作' }))
            return
          }
          balanceCache = null
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify({ ...pricingPayload(), source: result.source, verifiedAt: result.verifiedAt }))
        } catch (err) {
          res.writeHead(400, JSON_HEADERS)
          res.end(JSON.stringify({ ok: false, code: 'INVALID_PRICING', error: String((err && err.message) || err).slice(0, 300) }))
        }
      },
    }))

    function dialoguePayload() {
      const current = dialogueStore.load()
      return {
        ok: true,
        config: current.config,
        source: current.source,
        hasBackup: dialogueStore.hasBackup(),
      }
    }

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/dialogues.json',
      handler: async (req, res) => {
        if (!requireMethod(req, res, ['GET', 'PUT', 'POST'])) return
        if (!requireSameOrigin(req, res)) return
        if (req.method === 'GET') {
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify(dialoguePayload()))
          return
        }
        try {
          const parsed = JSON.parse(await readBody(req, 262144))
          if (req.method === 'PUT') {
            dialogueStore.save(parsed && parsed.config ? parsed.config : parsed)
          } else if (parsed && parsed.action === 'restore-backup') {
            dialogueStore.restoreBackup()
          } else if (parsed && parsed.action === 'reset-defaults') {
            dialogueStore.resetToDefaults()
          } else {
            res.writeHead(400, JSON_HEADERS)
            res.end(JSON.stringify({ ok: false, code: 'INVALID_ACTION', error: '未知的台词操作' }))
            return
          }
          res.writeHead(200, JSON_HEADERS)
          res.end(JSON.stringify(dialoguePayload()))
        } catch (err) {
          res.writeHead(400, JSON_HEADERS)
          res.end(JSON.stringify({ ok: false, code: 'INVALID_DIALOGUES', error: String((err && err.message) || err).slice(0, 300) }))
        }
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/events',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        if (!requireSameOrigin(req, res)) return
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        })
        const stream = { req, res, sessionId: sessionIdFromRequest(req) }
        usageStreams.add(stream)
        writeUsageEvent(stream)
        const close = () => usageStreams.delete(stream)
        if (typeof req.on === 'function') req.on('close', close)
      },
    }))

    const heartbeatTimer = setInterval(() => {
      for (const stream of usageStreams) {
        try { stream.res.write(': keep-alive\n\n') } catch { usageStreams.delete(stream) }
      }
    }, 25000)
    if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref()
    disposers.push(() => clearInterval(heartbeatTimer))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/size.json',
      handler: async (req, res) => {
        if (!requireMethod(req, res, ['GET', 'PUT', 'POST'])) return
        if (!requireSameOrigin(req, res)) return
        if (req.method === 'PUT' || req.method === 'POST') {
          try {
            const body = await readBody(req)
            const parsed = JSON.parse(body)
            const validated = validateConfigInput(parsed)
            if (!validated.ok) {
              res.writeHead(400, JSON_HEADERS)
              res.end(JSON.stringify({ ok: false, code: 'INVALID_CONFIG', error: validated.error }))
              return
            }
            const old = readSizeConfig()
            if (!old || old.usageMode !== validated.value.usageMode) balanceCache = null
            const persisted = configStore.write(validated.value)
            if (!persisted) console.warn('[dsh-whale-widget] widget config could not be persisted')
            const result = persisted ? { ok: true, ...validated.value } : { ok: false, code: 'WRITE_FAILED', error: '无法持久化挂件设置' }
            res.writeHead(persisted ? 200 : 500, JSON_HEADERS)
            res.end(JSON.stringify(result))
          } catch (err) {
            res.writeHead(400, JSON_HEADERS)
            res.end(JSON.stringify({ ok: false, error: String((err && err.message) || err) }))
          }
          return
        }
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify(readSizeConfig() || {}))
      },
    }))

    function loadSound(candidates) {
      for (const p of candidates) {
        try {
          const bytes = fs.readFileSync(p)
          if (bytes && bytes.length > 0) return bytes
        } catch (err) {}
      }
      return null
    }

    function serveSound(req, res, candidates) {
      const bytes = loadSound(candidates)
      if (!bytes) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('sound unavailable')
        return
      }
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'Content-Length': String(bytes.length),
      })
      res.end(bytes)
    }

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/sound/press.mp3',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        const set = SOUND_SETS[soundSetFromUrl(req.url)] || SOUND_SETS.duck
        serveSound(req, res, set.press)
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/sound/release.mp3',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        const set = SOUND_SETS[soundSetFromUrl(req.url)] || SOUND_SETS.duck
        serveSound(req, res, set.release)
      },
    }))

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-whale/widget.js',
      handler: (req, res) => {
        if (!requireMethod(req, res, ['GET'])) return
        try {
          const source = loadWidgetScript()
          res.writeHead(200, {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          })
          res.end(source)
        } catch (err) {
          console.error('[dsh-whale-widget] widget script unavailable:', String((err && err.message) || err))
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
          res.end('widget script unavailable')
        }
      },
    }))

    disposers.push(ctx.webServer.tapIndex((html) => {
      if (html.indexOf('/dsh-whale/widget.js') !== -1) return html
      const tag = '<script defer src="/dsh-whale/widget.js"></script>'
      if (html.indexOf('</body>') !== -1) return html.replace('</body>', tag + '</body>')
      return html + tag
    }))

    ctx.effect(() => () => {
      for (const stream of usageStreams) {
        try { stream.res.end() } catch {}
      }
      usageStreams.clear()
      for (const d of disposers) {
        try { d() } catch (err) {}
      }
    })
}

export { name, inject, apply }
