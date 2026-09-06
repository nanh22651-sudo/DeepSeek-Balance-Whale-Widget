import test from 'node:test'
import assert from 'node:assert/strict'
import { updateUsageLedger } from '../lib/usage-ledger.js'

const day1 = new Date(2026, 8, 5, 12)
const day2 = new Date(2026, 8, 6, 12)

test('balance decreases accumulate daily usage', () => {
  const initial = updateUsageLedger(null, 100, 'CNY', day1)
  const next = updateUsageLedger(initial, 98.25, 'CNY', day1)
  assert.equal(next.todayUsage, 1.75)
})

test('top-ups do not create negative usage', () => {
  const initial = updateUsageLedger(null, 100, 'CNY', day1)
  const next = updateUsageLedger(initial, 120, 'CNY', day1)
  assert.equal(next.todayUsage, 0)
  assert.equal(next.lastBalance, 120)
})

test('currency changes reset the baseline without recording usage', () => {
  const initial = updateUsageLedger(null, 100, 'CNY', day1)
  const next = updateUsageLedger(initial, 10, 'USD', day1)
  assert.equal(next.todayUsage, 0)
  assert.equal(next.lastCurrency, 'USD')
})

test('a new day archives and resets usage', () => {
  let ledger = updateUsageLedger(null, 100, 'CNY', day1)
  ledger = updateUsageLedger(ledger, 98, 'CNY', day1)
  ledger = updateUsageLedger(ledger, 97, 'CNY', day2)
  assert.equal(ledger.todayUsage, 0)
  assert.equal(ledger.history['2026-09-05'], 2)
})
