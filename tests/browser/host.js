// Exercise the same HTTP handlers and HTML transform installed into DSH.
import http from 'node:http'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function startHost() {
  const root = process.env.WHALE_TEST_PACKAGE
    ? pathToFileURL(path.resolve(process.env.WHALE_TEST_PACKAGE) + path.sep)
    : new URL('../../', import.meta.url)
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'whale-ui-'))
  const originalHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const { apply } = await import(new URL('lib/index.js', root))
  const pkg = JSON.parse(await fs.readFile(new URL('package.json', root), 'utf8'))
  const bridge = await fs.readFile(new URL(pkg.exports['./client'], root))
  const routes = new Map()
  let inject, dispose
  apply({
    webServer: {
      register({ path, handler }) { routes.set(path, handler); return () => routes.delete(path) },
      tapIndex(fn) { inject = fn; return () => {} },
    },
    credentials: { resolve: async () => null },
    on: () => () => {},
    effect(fn) { dispose = fn() },
  })
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/') {
      const html = '<!doctype html><html><head></head><body></body></html>'
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(url.searchParams.has('desktop') ? html : inject(html))
    } else if (url.pathname === '/bridge.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' })
      res.end(bridge)
    } else if (routes.has(url.pathname)) {
      routes.get(url.pathname)(req, res)
    } else {
      res.writeHead(404).end()
    }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    url: 'http://127.0.0.1:' + server.address().port,
    async close() {
      dispose()
      await new Promise(resolve => server.close(resolve))
      if (originalHome === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = originalHome
      await fs.rm(home, { recursive: true, force: true })
    },
  }
}
