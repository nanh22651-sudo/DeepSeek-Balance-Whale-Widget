import test from 'node:test'
import assert from 'node:assert/strict'
import { cloneDefaultDialogueConfig, DEFAULT_DIALOGUE_CONFIG, validateDialogueConfig } from '../lib/dialogues.js'

test('built-in dialogue configuration is valid and savage lines default to disabled', () => {
  assert.equal(validateDialogueConfig(DEFAULT_DIALOGUE_CONFIG).ok, true)
  const savage = DEFAULT_DIALOGUE_CONFIG.dialogues.filter((entry) => entry.category === 'savage')
  assert.ok(savage.length > 0)
  assert.equal(savage.every((entry) => entry.enabled === false), true)
})

test('dialogue validation rejects duplicate ids, unknown variables, and unsafe sizes', () => {
  const duplicate = cloneDefaultDialogueConfig()
  duplicate.dialogues[1].id = duplicate.dialogues[0].id
  assert.equal(validateDialogueConfig(duplicate).ok, false)

  const variable = cloneDefaultDialogueConfig()
  variable.dialogues[0].text = '余额是 {secret}'
  assert.equal(validateDialogueConfig(variable).ok, false)

  const weight = cloneDefaultDialogueConfig()
  weight.dialogues[0].weight = 0
  assert.equal(validateDialogueConfig(weight).ok, false)
})

test('cloned defaults do not mutate the built-in dialogue pool', () => {
  const clone = cloneDefaultDialogueConfig()
  clone.dialogues[0].text = 'changed'
  assert.notEqual(DEFAULT_DIALOGUE_CONFIG.dialogues[0].text, 'changed')
})
