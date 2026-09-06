// Prices are CNY per million tokens. User overrides are loaded by pricing-store.js.
export const DEFAULT_PRICING_CONFIG = {
  version: 1,
  currency: 'CNY',
  verifiedAt: '2026-09-05',
  peakSchedule: {
    timezone: 'Asia/Shanghai',
    weekdays: [[9, 12], [14, 18]],
    weekendOffPeakFrom: '2026-08-23T00:00:00+08:00',
  },
  models: {
    'deepseek-v4-flash-vision-exp': {
      aliases: [],
      cacheHit: { offPeak: 0.05, peak: 0.1 },
      cacheMiss: { offPeak: 1.5, peak: 3.0 },
      output: { offPeak: 4.5, peak: 9.0 },
    },
    'deepseek-v4-flash': {
      aliases: ['deepseek-chat', 'deepseek-reasoner'],
      cacheHit: { offPeak: 0.05, peak: 0.1 },
      cacheMiss: { offPeak: 1.5, peak: 3.0 },
      output: { offPeak: 4.5, peak: 9.0 },
    },
    'deepseek-v4-pro': {
      aliases: [],
      cacheHit: { offPeak: 0.15, peak: 0.3 },
      cacheMiss: { offPeak: 4.5, peak: 9.0 },
      output: { offPeak: 13.5, peak: 27.0 },
    },
  },
}

function pricePair(value) {
  return value &&
    Number.isFinite(value.offPeak) && value.offPeak >= 0 &&
    Number.isFinite(value.peak) && value.peak >= 0
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validatePricingConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return { ok: false, error: 'pricing config must be an object' }
  if (config.version !== 1) return { ok: false, error: 'unsupported pricing config version' }
  if (config.currency !== 'CNY') return { ok: false, error: 'currency must be CNY' }
  if (!validIsoDate(config.verifiedAt)) {
    return { ok: false, error: 'verifiedAt must be a valid YYYY-MM-DD date' }
  }
  const schedule = config.peakSchedule
  if (!schedule || schedule.timezone !== 'Asia/Shanghai') return { ok: false, error: 'peakSchedule.timezone must be Asia/Shanghai' }
  if (!Array.isArray(schedule.weekdays) || schedule.weekdays.length === 0) return { ok: false, error: 'peakSchedule.weekdays must not be empty' }
  for (const range of schedule.weekdays) {
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 0 || range[1] > 24 || range[0] >= range[1]) {
      return { ok: false, error: 'invalid peak hour range' }
    }
  }
  const weekendBoundary = Date.parse(schedule.weekendOffPeakFrom)
  if (!Number.isFinite(weekendBoundary)) return { ok: false, error: 'invalid weekendOffPeakFrom' }
  if (!config.models || typeof config.models !== 'object' || Array.isArray(config.models) || Object.keys(config.models).length === 0) {
    return { ok: false, error: 'models must not be empty' }
  }
  if (Object.keys(config.models).length > 100) return { ok: false, error: 'too many pricing models' }
  const identifiers = new Set()
  for (const [model, prices] of Object.entries(config.models)) {
    if (model.length > 120 || !/^[a-z0-9._-]+$/i.test(model)) return { ok: false, error: `invalid model name: ${model}` }
    const modelKey = model.toLowerCase()
    if (identifiers.has(modelKey)) return { ok: false, error: `duplicate model or alias: ${model}` }
    identifiers.add(modelKey)
    if (!prices || !pricePair(prices.cacheHit) || !pricePair(prices.cacheMiss) || !pricePair(prices.output)) {
      return { ok: false, error: `invalid prices for model: ${model}` }
    }
    if (prices.aliases !== undefined && (!Array.isArray(prices.aliases) || prices.aliases.length > 100 || prices.aliases.some((alias) => typeof alias !== 'string' || !alias || alias.length > 120 || !/^[a-z0-9._-]+$/i.test(alias)))) {
      return { ok: false, error: `invalid aliases for model: ${model}` }
    }
    for (const alias of prices.aliases || []) {
      const aliasKey = alias.toLowerCase()
      if (identifiers.has(aliasKey)) return { ok: false, error: `duplicate model or alias: ${alias}` }
      identifiers.add(aliasKey)
    }
  }
  return { ok: true, value: config }
}

export function resolvePrice(model, config = DEFAULT_PRICING_CONFIG) {
  const value = String(model || '').toLowerCase()
  if (!value) return null
  for (const [canonicalModel, prices] of Object.entries(config.models)) {
    const candidates = [canonicalModel, ...(prices.aliases || [])]
    if (candidates.some((candidate) => value.includes(String(candidate).toLowerCase()))) {
      return { model: canonicalModel, prices }
    }
  }
  return null
}

export function isPeakTime(timeSec, config = DEFAULT_PRICING_CONFIG) {
  const timestamp = Number(timeSec)
  if (!Number.isFinite(timestamp)) return false
  const beijing = new Date(timestamp * 1000 + 8 * 3600 * 1000)
  const weekendBoundarySec = Date.parse(config.peakSchedule.weekendOffPeakFrom) / 1000
  if (timestamp >= weekendBoundarySec) {
    const day = beijing.getUTCDay()
    if (day === 0 || day === 6) return false
  }
  const hour = beijing.getUTCHours()
  return config.peakSchedule.weekdays.some(([start, end]) => hour >= start && hour < end)
}

function beijingParts(timeSec) {
  const date = new Date(Number(timeSec) * 1000 + 8 * 3600 * 1000)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    weekDay: date.getUTCDay(),
    hour: date.getUTCHours(),
  }
}

function beijingEpoch(parts, hour, dayOffset = 0) {
  return Math.floor((Date.UTC(parts.year, parts.month, parts.day + dayOffset, hour) - 8 * 3600 * 1000) / 1000)
}

export function getPeakStatus(timeSec = Date.now() / 1000, config = DEFAULT_PRICING_CONFIG) {
  const timestamp = Number(timeSec)
  if (!Number.isFinite(timestamp)) return null
  const currentPeak = isPeakTime(timestamp, config)
  const parts = beijingParts(timestamp)
  const weekendPolicyActive = timestamp >= Date.parse(config.peakSchedule.weekendOffPeakFrom) / 1000
  const weekendOffPeak = weekendPolicyActive && (parts.weekDay === 0 || parts.weekDay === 6)
  const candidates = []
  // Scan eight Beijing calendar days so a weekend always reaches Monday.
  for (let offset = 0; offset <= 8; offset++) {
    const dayStart = beijingEpoch(parts, 0, offset)
    for (const [start, end] of config.peakSchedule.weekdays) {
      candidates.push(dayStart + start * 3600, dayStart + end * 3600)
    }
    candidates.push(dayStart + 24 * 3600)
  }
  candidates.sort((a, b) => a - b)
  let nextChangeAt = null
  let nextPeak = currentPeak
  for (const candidate of candidates) {
    if (candidate <= timestamp) continue
    const after = isPeakTime(candidate + 1, config)
    if (after !== currentPeak) {
      nextChangeAt = candidate
      nextPeak = after
      break
    }
  }
  return {
    timezone: config.peakSchedule.timezone,
    isPeak: currentPeak,
    band: currentPeak ? 'peak' : 'offPeak',
    weekendOffPeak,
    nextChangeAt,
    nextBand: nextChangeAt === null ? null : (nextPeak ? 'peak' : 'offPeak'),
  }
}

export function calculateTokenCost({ model, timeSec, hit = 0, miss = 0, output = 0 }, config = DEFAULT_PRICING_CONFIG) {
  const resolved = resolvePrice(model, config)
  if (!resolved) return null
  const band = isPeakTime(timeSec, config) ? 'peak' : 'offPeak'
  return (
    (Number(hit) || 0) / 1e6 * resolved.prices.cacheHit[band] +
    (Number(miss) || 0) / 1e6 * resolved.prices.cacheMiss[band] +
    (Number(output) || 0) / 1e6 * resolved.prices.output[band]
  )
}

export function computeMessageCost(usage, model, timeSec, config = DEFAULT_PRICING_CONFIG) {
  const input = Number(usage && usage.inputTokens) || 0
  const cache = Number(usage && usage.cacheReadTokens) || 0
  const output = Number(usage && usage.outputTokens) || 0
  const reasoning = Number(usage && usage.reasoningTokens) || 0
  const resolved = resolvePrice(model, config)
  return {
    // DSH inputTokens excludes cacheReadTokens. reasoningTokens is a detail of
    // outputTokens, so it must not be added a second time.
    tokens: input + cache + output,
    inputTokens: input,
    cacheReadTokens: cache,
    outputTokens: output,
    reasoningTokens: reasoning,
    amount: resolved ? calculateTokenCost({ model, timeSec, hit: cache, miss: input, output }, config) : null,
    pricingModel: resolved && resolved.model,
    unknownModel: resolved ? null : String(model || 'unknown'),
  }
}

export function computeTodayUsage(data, config = DEFAULT_PRICING_CONFIG) {
  let body = data
  if (body && body.data && body.data.biz_data && Array.isArray(body.data.biz_data.series)) body = body.data.biz_data
  else if (body && body.data && Array.isArray(body.data.series)) body = body.data
  const series = body && Array.isArray(body.series) ? body.series : null
  if (!series || series.length === 0) return null

  let amount = 0
  let tokens = 0
  let found = false
  const unknownModels = new Set()
  for (const item of series) {
    if (!item || typeof item !== 'object') continue
    const resolved = resolvePrice(item.model, config)
    for (const bucket of Array.isArray(item.buckets) ? item.buckets : []) {
      const usage = bucket && bucket.usage
      if (!usage || typeof usage !== 'object') continue
      const hit = Number(usage.PROMPT_CACHE_HIT_TOKEN) || 0
      const miss = Number(usage.PROMPT_CACHE_MISS_TOKEN) || 0
      const output = Number(usage.RESPONSE_TOKEN) || 0
      if (hit + miss + output === 0) continue
      found = true
      tokens += hit + miss + output
      if (!resolved) {
        unknownModels.add(String(item.model || 'unknown'))
        continue
      }
      amount += calculateTokenCost({ model: item.model, timeSec: bucket.time, hit, miss, output }, config)
    }
  }
  if (!found) return null
  return {
    amount: unknownModels.size ? null : amount,
    tokens,
    unknownModels: [...unknownModels],
  }
}
