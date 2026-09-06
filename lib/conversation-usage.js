import fs from 'node:fs'
import path from 'node:path'

const VERSION = 1

function localDay(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyTokens() {
  return { input: 0, cacheRead: 0, output: 0, reasoning: 0, total: 0 }
}

function emptyState(now) {
  return { version: VERSION, date: localDay(now), sessions: {}, updatedAt: now.toISOString() }
}

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function cleanText(value, max = 500) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function normalizeTokens(value) {
  const tokens = value && typeof value === 'object' ? value : {}
  return {
    input: finite(tokens.input),
    cacheRead: finite(tokens.cacheRead),
    output: finite(tokens.output),
    reasoning: finite(tokens.reasoning),
    total: finite(tokens.total),
  }
}

function normalizeSession(id, value) {
  const item = value && typeof value === 'object' ? value : {}
  return {
    id,
    cwd: cleanText(item.cwd),
    parentSessionId: cleanText(item.parentSessionId, 200),
    createdAt: finite(item.createdAt),
    updatedAt: finite(item.updatedAt),
    turns: Math.floor(finite(item.turns)),
    tokens: normalizeTokens(item.tokens),
    knownAmount: finite(item.knownAmount),
    unknownModels: Array.isArray(item.unknownModels)
      ? [...new Set(item.unknownModels.map((model) => cleanText(model, 160)).filter(Boolean))]
      : [],
    lastTurn: item.lastTurn && typeof item.lastTurn === 'object' ? normalizeTurn(item.lastTurn) : null,
  }
}

function normalizeTurn(value) {
  const item = value && typeof value === 'object' ? value : {}
  const unknownModels = Array.isArray(item.unknownModels)
    ? [...new Set(item.unknownModels.map((model) => cleanText(model, 160)).filter(Boolean))]
    : []
  const models = Array.isArray(item.models)
    ? [...new Set(item.models.map((model) => cleanText(model, 160)).filter(Boolean))]
    : []
  return {
    turn: Number.isFinite(Number(item.turn)) ? Number(item.turn) : null,
    amount: unknownModels.length ? null : finite(item.amount),
    knownAmount: finite(item.knownAmount !== undefined ? item.knownAmount : item.amount),
    tokens: normalizeTokens(item.tokens),
    unknownModels,
    models,
    ts: finite(item.ts),
  }
}

function normalizeState(value, now) {
  if (!value || typeof value !== 'object' || value.version !== VERSION || value.date !== localDay(now)) {
    return emptyState(now)
  }
  const sessions = {}
  if (value.sessions && typeof value.sessions === 'object') {
    for (const [id, session] of Object.entries(value.sessions)) {
      const cleanId = cleanText(id, 200)
      if (cleanId) sessions[cleanId] = normalizeSession(cleanId, session)
    }
  }
  return { version: VERSION, date: value.date, sessions, updatedAt: cleanText(value.updatedAt, 80) || now.toISOString() }
}

function addTokens(target, source) {
  const next = normalizeTokens(target)
  const value = normalizeTokens(source)
  for (const key of Object.keys(next)) next[key] += value[key]
  return next
}

function publicAmount(item) {
  return item.unknownModels.length ? null : item.knownAmount
}

function sessionRootId(sessions, sessionId) {
  let current = sessions[sessionId]
  if (!current) return sessionId || ''
  const seen = new Set()
  while (current.parentSessionId && sessions[current.parentSessionId] && !seen.has(current.id)) {
    seen.add(current.id)
    current = sessions[current.parentSessionId]
  }
  return current.id
}

function descendantsOf(sessions, rootId) {
  return Object.values(sessions).filter((session) => sessionRootId(sessions, session.id) === rootId)
}

function summarize(items) {
  const summary = {
    amount: 0,
    knownAmount: 0,
    tokens: emptyTokens(),
    unknownModels: [],
    turns: 0,
    mainAmount: 0,
    subagentAmount: 0,
    mainTokens: emptyTokens(),
    subagentTokens: emptyTokens(),
  }
  const unknown = new Set()
  for (const item of items) {
    summary.knownAmount += item.knownAmount
    summary.tokens = addTokens(summary.tokens, item.tokens)
    summary.turns += item.turns
    for (const model of item.unknownModels) unknown.add(model)
    if (item.parentSessionId) {
      summary.subagentAmount += item.knownAmount
      summary.subagentTokens = addTokens(summary.subagentTokens, item.tokens)
    } else {
      summary.mainAmount += item.knownAmount
      summary.mainTokens = addTokens(summary.mainTokens, item.tokens)
    }
  }
  summary.unknownModels = [...unknown]
  summary.amount = summary.unknownModels.length ? null : summary.knownAmount
  return summary
}

function latestTurn(items) {
  let result = null
  let sessionId = ''
  for (const item of items) {
    if (item.lastTurn && (!result || item.lastTurn.ts > result.ts)) {
      result = item.lastTurn
      sessionId = item.id
    }
  }
  return result ? { ...result, sessionId, isSubagent: !!items.find((item) => item.id === sessionId)?.parentSessionId } : null
}

function workspaceLabel(cwd) {
  if (!cwd) return '未归属工作区'
  return path.basename(cwd) || cwd
}

export function buildUsageSnapshot(state, selectedSessionId = '') {
  const sessions = state.sessions || {}
  const all = Object.values(sessions)
  const selected = sessions[selectedSessionId]
  const rootId = selected ? sessionRootId(sessions, selected.id) : ''
  const conversationItems = rootId ? descendantsOf(sessions, rootId) : []
  const selectedCwd = selected ? selected.cwd : ''
  const workspaceItems = selected ? all.filter((item) => item.cwd === selectedCwd) : []
  const grouped = new Map()
  for (const item of all) {
    const key = item.cwd || ''
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(item)
  }
  const workspaces = [...grouped.entries()].map(([cwd, items]) => ({
    cwd,
    name: workspaceLabel(cwd),
    ...summarize(items),
  })).sort((a, b) => b.tokens.total - a.tokens.total)
  return {
    version: VERSION,
    date: state.date,
    selectedSessionId: selected ? selected.id : null,
    rootSessionId: rootId || null,
    workspace: selected ? { cwd: selectedCwd, name: workspaceLabel(selectedCwd), ...summarize(workspaceItems) } : null,
    conversation: selected ? { cwd: selected.cwd, sessionCount: conversationItems.length, ...summarize(conversationItems) } : null,
    lastTurn: selected ? latestTurn(conversationItems) : latestTurn(all),
    today: summarize(all),
    workspaces,
    unassignedSessions: all.filter((item) => !item.cwd).length,
    updatedAt: state.updatedAt,
  }
}

function readCandidate(candidates, now) {
  for (const filename of candidates) {
    try {
      return { filename, state: normalizeState(JSON.parse(fs.readFileSync(filename, 'utf8')), now) }
    } catch {}
  }
  return { filename: candidates[0], state: emptyState(now) }
}

function atomicWrite(filename, state) {
  const directory = path.dirname(filename)
  fs.mkdirSync(directory, { recursive: true })
  const temp = `${filename}.tmp-${process.pid}`
  const backup = `${filename}.bak`
  fs.writeFileSync(temp, JSON.stringify(state), 'utf8')
  try {
    if (fs.existsSync(filename)) fs.copyFileSync(filename, backup)
    fs.renameSync(temp, filename)
  } catch (error) {
    try { fs.unlinkSync(temp) } catch {}
    throw error
  }
}

export function createConversationUsageStore(candidates, options = {}) {
  const now = options.now || (() => new Date())
  const logger = options.logger || console
  let loaded = readCandidate(candidates, now())

  function ensureToday() {
    const current = now()
    if (loaded.state.date !== localDay(current)) loaded.state = emptyState(current)
    return current
  }

  function recordTurn(meta, turn) {
    const current = ensureToday()
    const id = cleanText(meta && meta.id, 200)
    if (!id) return { persisted: false, snapshot: buildUsageSnapshot(loaded.state) }
    const existing = loaded.state.sessions[id] || normalizeSession(id, {})
    const normalizedTurn = normalizeTurn(turn)
    existing.cwd = cleanText(meta.cwd) || existing.cwd
    existing.parentSessionId = cleanText(meta.parentSessionId, 200) || existing.parentSessionId
    existing.createdAt = finite(meta.createdAt) || existing.createdAt || current.getTime()
    existing.updatedAt = normalizedTurn.ts || current.getTime()
    existing.turns += 1
    existing.tokens = addTokens(existing.tokens, normalizedTurn.tokens)
    existing.knownAmount += normalizedTurn.knownAmount
    existing.unknownModels = [...new Set([...existing.unknownModels, ...normalizedTurn.unknownModels])]
    existing.lastTurn = normalizedTurn
    loaded.state.sessions[id] = existing
    loaded.state.updatedAt = current.toISOString()
    let persisted = true
    try {
      atomicWrite(loaded.filename, loaded.state)
    } catch (error) {
      persisted = false
      logger.warn('[dsh-whale-widget] conversation usage could not be persisted: ' + String(error && error.message || error).slice(0, 160))
    }
    return { persisted, snapshot: buildUsageSnapshot(loaded.state, id) }
  }

  function observeSession(meta) {
    const current = ensureToday()
    const id = cleanText(meta && meta.id, 200)
    if (!id) return
    const existing = loaded.state.sessions[id] || normalizeSession(id, {})
    existing.cwd = cleanText(meta.cwd) || existing.cwd
    existing.parentSessionId = cleanText(meta.parentSessionId, 200) || existing.parentSessionId
    existing.createdAt = finite(meta.createdAt) || existing.createdAt || current.getTime()
    loaded.state.sessions[id] = existing
  }

  function snapshot(sessionId = '') {
    ensureToday()
    return buildUsageSnapshot(loaded.state, cleanText(sessionId, 200))
  }

  return { observeSession, recordTurn, snapshot }
}

export { localDay }
