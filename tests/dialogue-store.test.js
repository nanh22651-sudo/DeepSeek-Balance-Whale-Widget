import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createDialogueStore } from '../lib/dialogue-store.js'

test('dialogue store creates, saves, backs up, restores, and resets', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-dialogues-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'dialogues.json')
  const store = createDialogueStore(filename, { warn: () => {} })
  const initial = store.load()
  assert.equal(initial.source, 'user')
  assert.equal(fs.existsSync(filename), true)

  const changed = JSON.parse(JSON.stringify(initial.config))
  changed.dialogues[0].text = '自定义台词'
  assert.equal(store.save(changed).config.dialogues[0].text, '自定义台词')
  assert.equal(store.hasBackup(), true)
  assert.notEqual(store.restoreBackup().config.dialogues[0].text, '自定义台词')

  store.save(changed)
  assert.notEqual(store.resetToDefaults().config.dialogues[0].text, '自定义台词')
})

test('invalid dialogue saves leave the current file untouched', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-dialogues-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const filename = path.join(directory, 'dialogues.json')
  const store = createDialogueStore(filename, { warn: () => {} })
  store.load()
  const before = fs.readFileSync(filename, 'utf8')
  assert.throws(() => store.save({ version: 1, dialogues: [{ id: 'bad', text: '<b>x</b>', category: 'daily', rarity: 'normal', weight: 0, enabled: true }] }))
  assert.equal(fs.readFileSync(filename, 'utf8'), before)
})
