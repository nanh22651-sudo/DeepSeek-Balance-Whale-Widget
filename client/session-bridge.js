window.__ModuleLoader__.load({
  id: 'dsh-whale-widget',
  factory: function () {
    var exports = {}
    var inject = ['sessions']

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
      ctx.effect(function () {
        var dispose = ctx.sessions.list.subscribe(function () { publish(ctx) })
        return function () {
          if (typeof dispose === 'function') dispose()
          delete window.__DSH_WHALE_CURRENT_SESSION__
        }
      }, 'dsh-whale-widget: current session bridge')
    }

    exports.inject = inject
    exports.apply = apply
    return exports
  }
})
