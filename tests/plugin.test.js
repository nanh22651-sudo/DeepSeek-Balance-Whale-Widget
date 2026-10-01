import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const originalDshHome = process.env.DSH_HOME
const testDshHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-plugin-test-'))
process.env.DSH_HOME = testDshHome
const { apply, name } = await import('../lib/index.js?plugin-test-isolated-home')

after(() => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
  fs.rmSync(testDshHome, { recursive: true, force: true })
})

function responseRecorder() {
  return {
    status: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body = '') {
      this.body = body
    },
  }
}

function request(method, origin, body = '') {
  const req = Readable.from(body ? [Buffer.from(body)] : [])
  req.method = method
  req.url = '/'
  req.headers = { host: '127.0.0.1:3080' }
  if (origin) req.headers.origin = origin
  return req
}

function createContext() {
  const routes = new Map()
  let indexTransform = null
  return {
    routes,
    get indexTransform() { return indexTransform },
    webServer: {
      register(definition) {
        routes.set(definition.path, definition.handler)
        return () => routes.delete(definition.path)
      },
      tapIndex(transform) {
        indexTransform = transform
        return () => { indexTransform = null }
      },
    },
    credentials: { resolve: async () => null },
    on: () => () => {},
    effect: (factory) => factory(),
  }
}

test('plugin registers its routes and injects the browser script', async () => {
  const ctx = createContext()
  apply(ctx)
  assert.equal(name, 'dsh-whale-widget')
  assert.equal(ctx.routes.size, 12)
  assert.match(ctx.indexTransform('<body></body>'), /\/dsh-whale\/widget\.js/)

  const res = responseRecorder()
  await ctx.routes.get('/dsh-whale/widget.js')(request('GET'), res)
  assert.equal(res.status, 200)
  assert.match(String(res.body), /window\.__dshWhaleWidget/)
})

test('client module starts and disposes the widget for packaged Desktop pages', () => {
  const source = fs.readFileSync(new URL('../client/session-bridge.js', import.meta.url), 'utf8')
  assert.match(source, /WIDGET_SCRIPT_URL = '\/dsh-whale\/widget\.js'/)
  assert.match(source, /ensureWidgetScript\(\)/)
  assert.match(source, /document\.head\.appendChild\(script\)/)
  assert.match(source, /window\.__dshWhaleWidgetDispose\(\)/)
  assert.match(source, /dshWhaleOwned === 'true'/)
})

test('quick chat prepares dialogue before opening a closed bubble', async () => {
  const ctx = createContext()
  apply(ctx)
  const res = responseRecorder()
  await ctx.routes.get('/dsh-whale/widget.js')(request('GET'), res)
  const source = String(res.body)
  const match = /function showDialogueLines\([\s\S]*?\r?\n}\r?\nfunction applyBubbleLines/.exec(source)
  assert.ok(match)
  assert.doesNotMatch(match[0], /showBubble\(/)
  assert.ok(match[0].indexOf('applyBubbleLines(bubbleRandomLines)') < match[0].indexOf("bubbleBox.classList.add('dshwv-bubble-open')"))
  assert.match(source, /pricingAction\('预览'/)
})

test('widget exposes independent bubble durations and removes the peak wording selector', async () => {
  const ctx = createContext()
  apply(ctx)
  const res = responseRecorder()
  await ctx.routes.get('/dsh-whale/widget.js')(request('GET'), res)
  const source = String(res.body)
  assert.match(source, /余额气泡时长/)
  assert.match(source, /费用气泡时长/)
  assert.match(source, /聊天台词时长/)
  assert.match(source, /setTimeout\(hideBubble, balanceBubbleCloseMs\)/)
  assert.match(source, /setTimeout\(hideCostBubble, costBubbleCloseMs\)/)
  assert.match(source, /showDialogueLines\(pickDialogueLines\(\), dialogueBubbleCloseMs\)/)
  assert.doesNotMatch(source, /peakSelect|peakMode|梁文峰谷|强强/)
  assert.match(source, /window\.__dshWhaleWidgetDispose = disposeWhaleWidget/)
  assert.match(source, /document\.removeEventListener\('pointerdown', onDocPointerDown, true\)/)
})

test('pricing route is same-origin protected and exposes editor metadata', async () => {
  const ctx = createContext()
  apply(ctx)
  const handler = ctx.routes.get('/dsh-whale/pricing.json')
  const forbidden = responseRecorder()
  await handler(request('GET', 'https://evil.example'), forbidden)
  assert.equal(forbidden.status, 403)

  const res = responseRecorder()
  await handler(request('GET', 'http://127.0.0.1:3080'), res)
  const payload = JSON.parse(res.body)
  assert.equal(res.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.config.currency, 'CNY')
  assert.ok(payload.peakStatus.band === 'peak' || payload.peakStatus.band === 'offPeak')
})

test('dialogue editor route is registered and rejects cross-origin requests', async () => {
  const ctx = createContext()
  apply(ctx)
  const handler = ctx.routes.get('/dsh-whale/dialogues.json')
  assert.equal(typeof handler, 'function')
  const forbidden = responseRecorder()
  await handler(request('GET', 'https://evil.example'), forbidden)
  assert.equal(forbidden.status, 403)
})

test('usage route exposes an empty multi-session snapshot before the first turn', async () => {
  const ctx = createContext()
  apply(ctx)
  const res = responseRecorder()
  const req = request('GET', 'http://127.0.0.1:3080')
  req.url = '/dsh-whale/usage.json?sessionId=session-a'
  await ctx.routes.get('/dsh-whale/usage.json')(req, res)
  const payload = JSON.parse(res.body)
  assert.equal(res.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.selectedSessionId, null)
  assert.equal(payload.today.tokens.total, 0)
  assert.deepEqual(payload.workspaces, [])
})

test('settings route rejects cross-origin and malformed writes', async () => {
  const ctx = createContext()
  apply(ctx)
  const handler = ctx.routes.get('/dsh-whale/size.json')

  const forbidden = responseRecorder()
  await handler(request('POST', 'https://evil.example', JSON.stringify({ scale: 1 })), forbidden)
  assert.equal(forbidden.status, 403)

  const invalid = responseRecorder()
  await handler(request('POST', 'http://127.0.0.1:3080', JSON.stringify({ scale: 99 })), invalid)
  assert.equal(invalid.status, 400)
  assert.equal(JSON.parse(invalid.body).code, 'INVALID_CONFIG')
})

test('undeclared HTTP methods return 405', async () => {
  const ctx = createContext()
  apply(ctx)
  const res = responseRecorder()
  await ctx.routes.get('/dsh-whale/last-turn.json')(request('DELETE'), res)
  assert.equal(res.status, 405)
  assert.equal(res.headers.Allow, 'GET')
})
