import test from 'node:test'
import assert from 'node:assert/strict'
import { isSameOriginRequest } from '../lib/http-security.js'

test('same host origins and requests without Origin are accepted', () => {
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:3080' } }), true)
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' } }), true)
  assert.equal(isSameOriginRequest({ headers: { host: 'localhost:3080', origin: 'http://localhost:3080' } }), true)
})

test('the fixed Desktop carrier origin is accepted only for a loopback Host', () => {
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:19387', origin: 'dsh-app://app' } }), true)
  assert.equal(isSameOriginRequest({ headers: { host: 'localhost:19387', origin: 'dsh-app://app' } }), true)
  assert.equal(isSameOriginRequest({ headers: { host: 'evil.example:19387', origin: 'dsh-app://app' } }), false)
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:19387', origin: 'dsh-app://evil' } }), false)
})

test('cross-origin and opaque origins are rejected', () => {
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:3080', origin: 'https://evil.example' } }), false)
  assert.equal(isSameOriginRequest({ headers: { host: 'evil.example:3080', origin: 'http://evil.example:3080' } }), false)
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:3080', origin: 'null' } }), false)
  assert.equal(isSameOriginRequest({ headers: { host: '127.0.0.1:3080', 'sec-fetch-site': 'cross-site' } }), false)
})
