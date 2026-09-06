import fs from 'node:fs'
import path from 'node:path'
import { cloneDefaultDialogueConfig, DEFAULT_DIALOGUE_CONFIG, validateDialogueConfig } from './dialogues.js'

export function createDialogueStore(filename, logger = console) {
  let cache = null
  let cacheMtime = null
  let cacheRaw = null
  let lastWarning = ''

  function warnOnce(message) {
    if (message === lastWarning) return
    lastWarning = message
    logger.warn('[dsh-whale-widget] ' + message)
  }

  function invalidate() {
    cache = null
    cacheMtime = null
    cacheRaw = null
  }

  function ensureUserFile() {
    try {
      if (fs.existsSync(filename)) return true
      fs.mkdirSync(path.dirname(filename), { recursive: true })
      fs.writeFileSync(filename, JSON.stringify(DEFAULT_DIALOGUE_CONFIG, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' })
      return true
    } catch (err) {
      if (err && err.code === 'EEXIST') return true
      warnOnce('dialogue config could not be created; using built-in defaults')
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
      const validated = validateDialogueConfig(parsed)
      if (!validated.ok) throw new Error(validated.error)
      cacheMtime = stat.mtimeMs
      cacheRaw = raw
      cache = { config: validated.value, source: 'user' }
      lastWarning = ''
      return cache
    } catch (err) {
      warnOnce('invalid dialogue config; using built-in defaults: ' + String((err && err.message) || err).slice(0, 160))
      return { config: DEFAULT_DIALOGUE_CONFIG, source: 'builtin-fallback' }
    }
  }

  function atomicWrite(config, { backup = true } = {}) {
    const validated = validateDialogueConfig(config)
    if (!validated.ok) throw new Error(validated.error)
    fs.mkdirSync(path.dirname(filename), { recursive: true })
    const temporary = filename + '.tmp-' + process.pid + '-' + Date.now()
    try {
      fs.writeFileSync(temporary, JSON.stringify(validated.value, null, 2) + '\n', 'utf8')
      if (backup && fs.existsSync(filename)) {
        try {
          const previous = JSON.parse(fs.readFileSync(filename, 'utf8'))
          if (validateDialogueConfig(previous).ok) fs.copyFileSync(filename, filename + '.bak')
        } catch {}
      }
      fs.renameSync(temporary, filename)
    } finally {
      try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary) } catch {}
    }
    invalidate()
    return load()
  }

  function restoreBackup() {
    const backup = filename + '.bak'
    if (!fs.existsSync(backup)) throw new Error('尚无可恢复的台词备份')
    const parsed = JSON.parse(fs.readFileSync(backup, 'utf8'))
    const validated = validateDialogueConfig(parsed)
    if (!validated.ok) throw new Error('台词备份无效: ' + validated.error)
    return atomicWrite(validated.value, { backup: false })
  }

  return {
    filename,
    ensureUserFile,
    load,
    save: atomicWrite,
    restoreBackup,
    resetToDefaults: () => atomicWrite(cloneDefaultDialogueConfig()),
    hasBackup: () => fs.existsSync(filename + '.bak'),
  }
}
