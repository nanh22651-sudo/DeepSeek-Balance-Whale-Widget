import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG, normalizeConfig, validateConfigInput } from '../lib/config.js'

test('valid widget config is normalized', () => {
  const result = validateConfigInput({ ...DEFAULT_CONFIG, scrollGapPx: 20.4 })
  assert.equal(result.ok, true)
  assert.equal(result.value.scrollGapPx, 20)
})

test('unsafe or malformed values are rejected', () => {
  assert.equal(validateConfigInput({ scale: 99 }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, vol: 'loud' }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, unexpected: true }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, usageMode: 'anything' }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, dialogueStyle: 'hostile' }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, dialogueFrequency: 'always' }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, peakMode: 'liangwen' }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, balanceBubbleCloseMs: -1 }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, costBubbleCloseMs: 3600001 }).ok, false)
  assert.equal(validateConfigInput({ scale: 1, dialogueBubbleCloseMs: '5000' }).ok, false)
})

test('stored legacy config receives safe defaults and bounds', () => {
  const result = normalizeConfig({ scale: 10, vol: -2, scrollGapPx: 999, dialogueStyle: 'savage', peakMode: 'liangwen', turnCostCloseMs: 2300 })
  assert.equal(result.scale, 2.5)
  assert.equal(result.vol, 0)
  assert.equal(result.scrollGapPx, 200)
  assert.equal(result.balanceBubbleCloseMs, 5000)
  assert.equal(result.costBubbleCloseMs, 2300)
  assert.equal(result.dialogueBubbleCloseMs, 5000)
  assert.equal(Object.hasOwn(result, 'dialogueStyle'), false)
  assert.equal(Object.hasOwn(result, 'peakMode'), false)
  assert.equal(Object.hasOwn(result, 'turnCostCloseMs'), false)
})
