import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateTokenCost, computeMessageCost, computeTodayUsage, DEFAULT_PRICING_CONFIG, getPeakStatus, isPeakTime, resolvePrice, validatePricingConfig } from '../lib/pricing.js'

function beijingEpoch(year, month, day, hour) {
  return Math.floor(Date.UTC(year, month - 1, day, hour - 8) / 1000)
}

test('weekday peak boundaries use Beijing time', () => {
  assert.equal(isPeakTime(beijingEpoch(2026, 9, 7, 8)), false)
  assert.equal(isPeakTime(beijingEpoch(2026, 9, 7, 9)), true)
  assert.equal(isPeakTime(beijingEpoch(2026, 9, 7, 12)), false)
  assert.equal(isPeakTime(beijingEpoch(2026, 9, 7, 14)), true)
  assert.equal(isPeakTime(beijingEpoch(2026, 9, 7, 18)), false)
})

test('weekends after the policy boundary are always off-peak', () => {
  assert.equal(isPeakTime(beijingEpoch(2026, 9, 6, 10)), false)
})

test('peak status reports weekend policy and the next real transition', () => {
  const weekend = getPeakStatus(beijingEpoch(2026, 9, 6, 10))
  assert.equal(weekend.band, 'offPeak')
  assert.equal(weekend.weekendOffPeak, true)
  assert.equal(weekend.nextBand, 'peak')
  assert.equal(weekend.nextChangeAt, beijingEpoch(2026, 9, 7, 9))

  const peak = getPeakStatus(beijingEpoch(2026, 9, 7, 10))
  assert.equal(peak.band, 'peak')
  assert.equal(peak.nextBand, 'offPeak')
  assert.equal(peak.nextChangeAt, beijingEpoch(2026, 9, 7, 12))
})

test('pro model uses pro prices', () => {
  assert.equal(resolvePrice('deepseek-v4-pro').prices.output.offPeak, 13.5)
  assert.equal(calculateTokenCost({ model: 'deepseek-v4-pro', timeSec: beijingEpoch(2026, 9, 6, 10), output: 1e6 }), 13.5)
})

test('reasoning tokens are details of output tokens and are not billed twice', () => {
  const result = computeMessageCost({
    inputTokens: 100,
    cacheReadTokens: 200,
    outputTokens: 300,
    reasoningTokens: 250,
  }, 'deepseek-v4-flash', beijingEpoch(2026, 9, 6, 10))
  assert.equal(result.tokens, 600)
  assert.equal(result.inputTokens, 100)
  assert.equal(result.cacheReadTokens, 200)
  assert.equal(result.outputTokens, 300)
  assert.equal(result.reasoningTokens, 250)
  assert.equal(result.amount, calculateTokenCost({
    model: 'deepseek-v4-flash',
    timeSec: beijingEpoch(2026, 9, 6, 10),
    hit: 200,
    miss: 100,
    output: 300,
  }))
})

test('unknown models return token counts but no estimated amount', () => {
  const result = computeMessageCost({ inputTokens: 10, outputTokens: 20 }, 'future-model', beijingEpoch(2026, 9, 6, 10))
  assert.equal(result.tokens, 30)
  assert.equal(result.amount, null)
  assert.equal(result.unknownModel, 'future-model')
})

test('platform usage response is aggregated', () => {
  const result = computeTodayUsage({ data: { biz_data: { series: [{
    model: 'deepseek-chat',
    buckets: [{ time: beijingEpoch(2026, 9, 6, 10), usage: {
      PROMPT_CACHE_HIT_TOKEN: 1e6,
      PROMPT_CACHE_MISS_TOKEN: 1e6,
      RESPONSE_TOKEN: 1e6,
    } }],
  }] } } })
  assert.deepEqual(result, { amount: 6.05, tokens: 3e6, unknownModels: [] })
})

test('platform usage with an unknown model does not produce a partial amount', () => {
  const result = computeTodayUsage({ data: { series: [{
    model: 'future-model',
    buckets: [{ time: beijingEpoch(2026, 9, 6, 10), usage: { RESPONSE_TOKEN: 10 } }],
  }] } })
  assert.equal(result.amount, null)
  assert.equal(result.tokens, 10)
  assert.deepEqual(result.unknownModels, ['future-model'])
})

test('pricing validation rejects impossible calendar dates and duplicate aliases', () => {
  const invalidDate = JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG))
  invalidDate.verifiedAt = '2026-99-99'
  assert.equal(validatePricingConfig(invalidDate).ok, false)

  const duplicate = JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG))
  duplicate.models['deepseek-v4-pro'].aliases = ['deepseek-chat']
  assert.equal(validatePricingConfig(duplicate).ok, false)
})
