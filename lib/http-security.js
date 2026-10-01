export const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
})

export function isSameOriginRequest(req) {
  const origin = req && req.headers && req.headers.origin
  const fetchSite = req && req.headers && req.headers['sec-fetch-site']
  if (!origin) return fetchSite !== 'cross-site' // Keep CLI health checks working.
  const host = req.headers.host
  if (!host) return false
  try {
    const parsed = new URL(origin)
    const requestHost = new URL(`http://${host}`)
    const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
    const requestIsLoopback = loopbackHosts.has(requestHost.hostname)
    const isLoopback = loopbackHosts.has(parsed.hostname) && loopbackHosts.has(requestHost.hostname)
    // The signed Desktop renderer is served from this fixed custom origin and
    // forwards its requests to the loopback Host. Keep the exception narrow:
    // no other dsh-app authority and no non-loopback destination is trusted.
    const isDesktopCarrier = parsed.protocol === 'dsh-app:' && parsed.hostname === 'app' && requestIsLoopback
    const configuredOrigins = new Set(String(process.env.DSH_WHALE_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean))
    const explicitlyAllowed = configuredOrigins.has(parsed.origin)
    return isDesktopCarrier || (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.host === host &&
      (isLoopback || explicitlyAllowed)
    )
  } catch {
    return false
  }
}

export function requireMethod(req, res, methods) {
  const allowed = methods.map((method) => method.toUpperCase())
  const actual = String(req.method || 'GET').toUpperCase()
  if (allowed.includes(actual)) return true
  res.writeHead(405, { ...JSON_HEADERS, Allow: allowed.join(', ') })
  res.end(JSON.stringify({ ok: false, code: 'METHOD_NOT_ALLOWED', error: 'method not allowed' }))
  return false
}

export function requireSameOrigin(req, res) {
  if (isSameOriginRequest(req)) return true
  res.writeHead(403, JSON_HEADERS)
  res.end(JSON.stringify({ ok: false, code: 'FORBIDDEN_ORIGIN', error: 'cross-origin request rejected' }))
  return false
}
