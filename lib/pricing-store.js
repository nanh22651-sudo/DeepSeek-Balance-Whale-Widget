import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_PRICING_CONFIG, validatePricingConfig } from './pricing.js'

export function createPricingStore(filename, logger = console) {
  let cache = null
  let cacheMtime = null
  let cacheRaw = null
  let lastWarning = ''

  function warnOnce(message) {
    if (message === lastWarning) return
    lastWarning = message
    logger.warn('[dsh-whale-widget] ' + message)
  }

  function ensureUserFile() {
    try {
      if (fs.existsSync(filename)) return true
      fs.mkdirSync(path.dirname(filename), { recursive: true })
      fs.writeFileSync(filename, JSON.stringify(DEFAULT_PRICING_CONFIG, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' })
      return true
    } catch (err) {
      if (err && err.code === 'EEXIST') return true
      warnOnce('pricing config could not be created; using built-in defaults')
      return false
    }
  }

  function load() {
    ensureUserFile()
    try {
      const stat = fs.statSync(filename)
      const raw = fs.readFileSync(filename, 'utf8')
      if (cache && cacheMtime === stat.mtimeMs && cacheRaw === raw) return cache
      const parsed = JSON.parse(raw)
      const validated = validatePricingConfig(parsed)
      if (!validated.ok) throw new Error(validated.error)
      cacheMtime = stat.mtimeMs
      cacheRaw = raw
      cache = {
        config: validated.value,
        source: 'user',
        verifiedAt: validated.value.verifiedAt,
      }
      lastWarning = ''
      return cache
    } catch (err) {
      warnOnce('invalid pricing config; using built-in defaults: ' + String((err && err.message) || err).slice(0, 160))
      return {
        config: DEFAULT_PRICING_CONFIG,
        source: 'builtin-fallback',
        verifiedAt: DEFAULT_PRICING_CONFIG.verifiedAt,
      }
    }
  }

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG))
  }

  function invalidate() {
    cache = null
    cacheMtime = null
    cacheRaw = null
  }

  function atomicWrite(config, { backup = true } = {}) {
    const validated = validatePricingConfig(config)
    if (!validated.ok) throw new Error(validated.error)
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    const temporary = filename + '.tmp-' + process.pid + '-' + Date.now()
    try {
      fs.writeFileSync(temporary, JSON.stringify(validated.value, null, 2) + '\n', 'utf8')
      if (backup && fs.existsSync(filename)) {
        try {
          const previous = JSON.parse(fs.readFileSync(filename, 'utf8'))
          if (validatePricingConfig(previous).ok) fs.copyFileSync(filename, filename + '.bak')
        } catch {}
      }
      fs.renameSync(temporary, filename)
    } finally {
      try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) } catch {}
    }
    invalidate()
    return load()
  }

  function save(config) {
    return atomicWrite(config)
  }

  function restoreBackup() {
    const backup = filename + '.bak'
    if (!fs.existsSync(backup)) throw new Error('尚无可恢复的价格备份')
    const parsed = JSON.parse(fs.readFileSync(backup, 'utf8'))
    const validated = validatePricingConfig(parsed)
    if (!validated.ok) throw new Error('价格备份无效: ' + validated.error)
    return atomicWrite(validated.value, { backup: false })
  }

  function resetToDefaults() {
    return atomicWrite(cloneDefaults())
  }

  function hasBackup() {
    return fs.existsSync(filename + '.bak')
  }

  return { filename, ensureUserFile, load, save, restoreBackup, resetToDefaults, hasBackup }
}
