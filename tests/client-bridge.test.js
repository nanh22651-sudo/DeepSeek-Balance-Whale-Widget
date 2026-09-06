import test from 'node:test'
import assert from 'node:assert/strict'

test('client bridge publishes and follows the selected DSH session', async () => {
  const originalWindow = globalThis.window
  let registration = null
  let current = 'session-a'
  let listener = null
  let cleanup = null
  const fakeWindow = new EventTarget()
  fakeWindow.__ModuleLoader__ = { load(value) { registration = value } }
  globalThis.window = fakeWindow

  try {
    await import('../client/session-bridge.js?client-bridge-test')
    assert.equal(registration.id, 'dsh-whale-widget')
    const plugin = registration.factory()
    assert.deepEqual(plugin.inject, ['sessions'])
    const ctx = {
      sessions: { list: {
        getSnapshot() { return { current, byId: { 'session-a': { cwd: 'D:\\A' }, 'session-b': { cwd: 'D:\\B' } } } },
        subscribe(fn) { listener = fn; return () => { listener = null } },
      } },
      effect(factory) { cleanup = factory() },
    }
    plugin.apply(ctx)
    assert.deepEqual(fakeWindow.__DSH_WHALE_CURRENT_SESSION__, { sessionId: 'session-a', cwd: 'D:\\A' })
    current = 'session-b'
    listener()
    assert.deepEqual(fakeWindow.__DSH_WHALE_CURRENT_SESSION__, { sessionId: 'session-b', cwd: 'D:\\B' })
    cleanup()
    assert.equal(fakeWindow.__DSH_WHALE_CURRENT_SESSION__, undefined)
  } finally {
    globalThis.window = originalWindow
  }
})
