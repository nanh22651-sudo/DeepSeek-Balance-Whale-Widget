window.__ModuleLoader__.load({
  id: 'dsh-whale-widget',
  factory: function () {
    var exports = {}
    var inject = ['sessions']
    var WIDGET_SCRIPT_ID = 'dsh-whale-widget-script'
    var WIDGET_SCRIPT_URL = '/dsh-whale/widget.js'

    function findWidgetScript() {
      return document.getElementById(WIDGET_SCRIPT_ID) ||
        document.querySelector('script[src="' + WIDGET_SCRIPT_URL + '"]')
    }

    function ensureWidgetScript() {
      if (window.__dshWhaleWidget || findWidgetScript()) return
      var script = document.createElement('script')
      script.id = WIDGET_SCRIPT_ID
      script.src = WIDGET_SCRIPT_URL
      script.defer = true
      script.dataset.dshWhaleOwned = 'true'
      document.head.appendChild(script)
    }

    function disposeWidgetScript() {
      if (typeof window.__dshWhaleWidgetDispose === 'function') {
        try { window.__dshWhaleWidgetDispose() } catch (err) {}
      }
      var script = findWidgetScript()
      if (script && script.dataset && script.dataset.dshWhaleOwned === 'true') script.remove()
    }

    function publish(ctx) {
      var snapshot = ctx.sessions.list.getSnapshot()
      var sessionId = snapshot && typeof snapshot.current === 'string' ? snapshot.current : ''
      var summary = sessionId && snapshot.byId ? snapshot.byId[sessionId] : null
      var detail = {
        sessionId: sessionId,
        cwd: summary && typeof summary.cwd === 'string' ? summary.cwd : ''
      }
      window.__DSH_WHALE_CURRENT_SESSION__ = detail
      window.dispatchEvent(new CustomEvent('dsh-whale-session-change', { detail: detail }))
    }

    function apply(ctx) {
      publish(ctx)
      // Desktop loads its packaged dsh-app:// document, so Host tapIndex()
      // transforms never see that HTML. Start the widget from the standard
      // dsh.client lifecycle as well; the widget guard keeps Web mode idempotent.
      ensureWidgetScript()
      ctx.effect(function () {
        var dispose = ctx.sessions.list.subscribe(function () { publish(ctx) })
        return function () {
          if (typeof dispose === 'function') dispose()
          delete window.__DSH_WHALE_CURRENT_SESSION__
          disposeWidgetScript()
        }
      }, 'dsh-whale-widget: current session bridge')
    }

    exports.inject = inject
    exports.apply = apply
    return exports
  }
})
