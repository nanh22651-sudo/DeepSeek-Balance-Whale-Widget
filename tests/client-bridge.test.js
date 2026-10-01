import test from 'node:test'
import assert from 'node:assert/strict'

test('client bridge publishes and follows the selected DSH session', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  let registration = null
  let current = 'session-a'
  let listener = null
  let cleanup = null
  let widgetScript = null
  let widgetDisposeCalls = 0
  const fakeWindow = new EventTarget()
  fakeWindow.__ModuleLoader__ = { load(value) { registration = value } }
  fakeWindow.__dshWhaleWidgetDispose = () => { widgetDisposeCalls++ }
  const fakeDocument = {
    getElementById(id) { return widgetScript && widgetScript.id === id ? widgetScript : null },
    querySelector(selector) { return widgetScript && selector.includes(widgetScript.src) ? widgetScript : null },
    createElement(tag) {
      assert.equal(tag, 'script')
      return {
        id: '',
        src: '',
        defer: false,
        dataset: {},
        remove() { widgetScript = null },
      }
    },
    head: { appendChild(script) { widgetScript = script } },
  }
  globalThis.window = fakeWindow
  globalThis.document = fakeDocument

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
    assert.equal(widgetScript.id, 'dsh-whale-widget-script')
    assert.equal(widgetScript.src, '/dsh-whale/widget.js')
    assert.equal(widgetScript.dataset.dshWhaleOwned, 'true')
    assert.deepEqual(fakeWindow.__DSH_WHALE_CURRENT_SESSION__, { sessionId: 'session-a', cwd: 'D:\\A' })
    current = 'session-b'
    listener()
    assert.deepEqual(fakeWindow.__DSH_WHALE_CURRENT_SESSION__, { sessionId: 'session-b', cwd: 'D:\\B' })
    cleanup()
    assert.equal(fakeWindow.__DSH_WHALE_CURRENT_SESSION__, undefined)
    assert.equal(widgetDisposeCalls, 1)
    assert.equal(widgetScript, null)
  } finally {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
  }
})
