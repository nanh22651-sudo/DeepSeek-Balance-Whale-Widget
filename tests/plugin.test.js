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
  assert.equal(ctx.routes.size, 14)
  assert.match(ctx.indexTransform('<body></body>'), /\/dsh-whale\/widget\.js/)

  const res = responseRecorder()
  await ctx.routes.get('/dsh-whale/widget.js')(request('GET'), res)
  assert.equal(res.status, 200)
  assert.match(String(res.body), /window\.__dshWhaleWidget/)
})

test('portrait routes serve only their packaged PNG and reject writes', () => {
  const ctx = createContext()
  apply(ctx)
  for (const [route, file] of [
    ['image.png', 'DSniang1.png'], ['face-closed.png', 'face-closed.png'], ['face-smile.png', 'face-smile.png'],
  ]) {
    const handler = ctx.routes.get('/dsh-whale/' + route)
    const res = responseRecorder()
    handler(request('GET'), res)
    assert.equal(res.status, 200)
    assert.equal(res.headers['Content-Type'], 'image/png')
    assert.equal(res.body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.deepEqual(res.body, fs.readFileSync(new URL('../assets/' + file, import.meta.url)))
    const denied = responseRecorder()
    handler(request('PUT'), denied)
    assert.equal(denied.status, 405)
  }
})

test('missing expression has a clean 404 while the original whale remains available', (t) => {
  const ctx = createContext()
  apply(ctx)
  const read = fs.readFileSync
  t.mock.method(fs, 'readFileSync', (file, ...options) => {
    if (typeof file === 'string' && path.basename(file) === 'face-closed.png') throw Error('missing test file')
    return read(file, ...options)
  })
  const response = responseRecorder()
  ctx.routes.get('/dsh-whale/face-closed.png')(request('GET'), response)
  assert.equal(response.status, 404)
  assert.equal(response.body, 'whale image unavailable')
  ctx.routes.get('/dsh-whale/image.png')(request('GET'), response)
  assert.equal(response.status, 200)
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
