import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createPricingStore } from '../lib/pricing-store.js'

test('pricing store creates an editable user file and reloads valid changes', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-pricing-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'pricing.json')
  const warnings = []
  const store = createPricingStore(filename, { warn: (message) => warnings.push(message) })

  const initial = store.load()
  assert.equal(initial.source, 'user')
  assert.equal(fs.existsSync(filename), true)

  const custom = JSON.parse(fs.readFileSync(filename, 'utf8'))
  custom.models['deepseek-v4-flash'].output.offPeak = 8
  fs.writeFileSync(filename, JSON.stringify(custom), 'utf8')
  const changed = store.load()
  assert.equal(changed.config.models['deepseek-v4-flash'].output.offPeak, 8)
  assert.deepEqual(warnings, [])
})

test('invalid user pricing falls back to built-in defaults', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-pricing-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'pricing.json')
  fs.writeFileSync(filename, '{"version":999}', 'utf8')
  const warnings = []
  const result = createPricingStore(filename, { warn: (message) => warnings.push(message) }).load()
  assert.equal(result.source, 'builtin-fallback')
  assert.equal(warnings.length, 1)
})

test('saving prices creates a backup and restore recovers it', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-pricing-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'pricing.json')
  const store = createPricingStore(filename, { warn: () => {} })
  const original = store.load().config.models['deepseek-v4-flash'].output.offPeak
  const changed = JSON.parse(JSON.stringify(store.load().config))
  changed.models['deepseek-v4-flash'].output.offPeak = 88
  assert.equal(store.save(changed).config.models['deepseek-v4-flash'].output.offPeak, 88)
  assert.equal(store.hasBackup(), true)
  assert.equal(store.restoreBackup().config.models['deepseek-v4-flash'].output.offPeak, original)
})

test('invalid saves do not replace the current pricing file', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-pricing-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'pricing.json')
  const store = createPricingStore(filename, { warn: () => {} })
  store.load()
  const before = fs.readFileSync(filename, 'utf8')
  assert.throws(() => store.save({ version: 999 }))
  assert.equal(fs.readFileSync(filename, 'utf8'), before)
})

test('reset writes a fresh clone of built-in defaults', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-pricing-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'pricing.json')
  const store = createPricingStore(filename, { warn: () => {} })
  const config = JSON.parse(JSON.stringify(store.load().config))
  config.models['deepseek-v4-flash'].output.offPeak = 12
  store.save(config)
  assert.equal(store.resetToDefaults().config.models['deepseek-v4-flash'].output.offPeak, 4.5)
})
