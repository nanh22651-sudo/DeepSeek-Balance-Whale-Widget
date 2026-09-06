import fs from 'node:fs'

export const DEFAULT_CONFIG = Object.freeze({
  scale: 1.5,
  sound: true,
  vol: 0.9,
  soundSet: 'duck',
  usageMode: 'ledger',
  dialogueFrequency: 'normal',
  bubbleOn: true,
  turnCostOn: true,
  balanceBubbleCloseMs: 5000,
  costBubbleCloseMs: 5000,
  dialogueBubbleCloseMs: 5000,
  scrollGapOn: false,
  scrollGapPx: 17,
})

const ALLOWED_KEYS = new Set([...Object.keys(DEFAULT_CONFIG), 'updatedAt'])
const ENUMS = {
  soundSet: new Set(['duck', 'fx1']),
  usageMode: new Set(['ledger', 'token']),
  dialogueFrequency: new Set(['low', 'normal', 'high']),
}

function finiteNumber(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return `${name} must be a finite number between ${min} and ${max}`
  }
  return null
}

export function validateConfigInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'config must be a JSON object' }
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, error: `unknown config field: ${key}` }
  }
  if (!Object.hasOwn(input, 'scale')) return { ok: false, error: 'missing scale' }

  const numberChecks = [
    finiteNumber(input.scale, 'scale', 0.6, 2.5),
    Object.hasOwn(input, 'vol') ? finiteNumber(input.vol, 'vol', 0, 1) : null,
    Object.hasOwn(input, 'balanceBubbleCloseMs') ? finiteNumber(input.balanceBubbleCloseMs, 'balanceBubbleCloseMs', 0, 3600000) : null,
    Object.hasOwn(input, 'costBubbleCloseMs') ? finiteNumber(input.costBubbleCloseMs, 'costBubbleCloseMs', 0, 3600000) : null,
    Object.hasOwn(input, 'dialogueBubbleCloseMs') ? finiteNumber(input.dialogueBubbleCloseMs, 'dialogueBubbleCloseMs', 0, 3600000) : null,
    Object.hasOwn(input, 'scrollGapPx') ? finiteNumber(input.scrollGapPx, 'scrollGapPx', 0, 200) : null,
  ].filter(Boolean)
  if (numberChecks.length) return { ok: false, error: numberChecks[0] }

  for (const key of ['sound', 'bubbleOn', 'turnCostOn', 'scrollGapOn']) {
    if (Object.hasOwn(input, key) && typeof input[key] !== 'boolean') return { ok: false, error: `${key} must be boolean` }
  }
  for (const [key, values] of Object.entries(ENUMS)) {
    if (Object.hasOwn(input, key) && !values.has(input[key])) return { ok: false, error: `invalid ${key}` }
  }

  return { ok: true, value: normalizeConfig(input) }
}

export function normalizeConfig(input = {}) {
  const value = { ...DEFAULT_CONFIG }
  if (typeof input.scale === 'number' && Number.isFinite(input.scale)) value.scale = Math.min(2.5, Math.max(0.6, input.scale))
  if (typeof input.sound === 'boolean') value.sound = input.sound
  if (typeof input.vol === 'number' && Number.isFinite(input.vol)) value.vol = Math.min(1, Math.max(0, input.vol))
  if (ENUMS.soundSet.has(input.soundSet)) value.soundSet = input.soundSet
  if (ENUMS.usageMode.has(input.usageMode)) value.usageMode = input.usageMode
  if (ENUMS.dialogueFrequency.has(input.dialogueFrequency)) value.dialogueFrequency = input.dialogueFrequency
  if (typeof input.bubbleOn === 'boolean') value.bubbleOn = input.bubbleOn
  if (typeof input.turnCostOn === 'boolean') value.turnCostOn = input.turnCostOn
  if (typeof input.balanceBubbleCloseMs === 'number' && Number.isFinite(input.balanceBubbleCloseMs)) value.balanceBubbleCloseMs = Math.round(Math.min(3600000, Math.max(0, input.balanceBubbleCloseMs)))
  if (typeof input.costBubbleCloseMs === 'number' && Number.isFinite(input.costBubbleCloseMs)) {
    value.costBubbleCloseMs = Math.round(Math.min(3600000, Math.max(0, input.costBubbleCloseMs)))
  } else if (typeof input.turnCostCloseMs === 'number' && Number.isFinite(input.turnCostCloseMs)) {
    // v0.7.x used one close duration for the recent-turn cost bubble.
    value.costBubbleCloseMs = Math.round(Math.min(3600000, Math.max(0, input.turnCostCloseMs)))
  }
  if (typeof input.dialogueBubbleCloseMs === 'number' && Number.isFinite(input.dialogueBubbleCloseMs)) value.dialogueBubbleCloseMs = Math.round(Math.min(3600000, Math.max(0, input.dialogueBubbleCloseMs)))
  if (typeof input.scrollGapOn === 'boolean') value.scrollGapOn = input.scrollGapOn
  if (typeof input.scrollGapPx === 'number' && Number.isFinite(input.scrollGapPx)) value.scrollGapPx = Math.round(Math.min(200, Math.max(0, input.scrollGapPx)))
  return value
}

export function createConfigStore(fileCandidates) {
  function read() {
    for (const filename of fileCandidates) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'))
        if (parsed && typeof parsed === 'object' && typeof parsed.scale === 'number') return normalizeConfig(parsed)
      } catch {}
    }
    return null
  }

  function write(config) {
    const body = JSON.stringify({ ...normalizeConfig(config), updatedAt: new Date().toISOString() })
    for (const filename of fileCandidates) {
      try {
        fs.writeFileSync(filename, body, 'utf8')
        return true
      } catch {}
    }
    return false
  }

  return { read, write }
}
