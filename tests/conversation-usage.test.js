import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildUsageSnapshot, createConversationUsageStore } from '../lib/conversation-usage.js'

function turn({ amount = 0.01, input = 10, cacheRead = 20, output = 30, reasoning = 5, unknownModels = [], models = [], ts = 1 } = {}) {
  return {
    turn: 1,
    amount: unknownModels.length ? null : amount,
    tokens: { input, cacheRead, output, reasoning, total: input + cacheRead + output },
    unknownModels,
    models,
    ts,
  }
}

test('separates conversations and aggregates their workspace and daily totals', () => {
  const state = {
    version: 1,
    date: '2026-09-05',
    updatedAt: '2026-09-05T12:00:00.000Z',
    sessions: {
      a: { id: 'a', cwd: 'D:\\Paper', parentSessionId: '', createdAt: 1, updatedAt: 2, turns: 1, tokens: turn().tokens, knownAmount: 0.01, unknownModels: [], lastTurn: turn({ ts: 2 }) },
      b: { id: 'b', cwd: 'D:\\Paper', parentSessionId: '', createdAt: 1, updatedAt: 3, turns: 1, tokens: turn({ output: 40 }).tokens, knownAmount: 0.02, unknownModels: [], lastTurn: turn({ amount: 0.02, output: 40, ts: 3 }) },
      c: { id: 'c', cwd: 'D:\\Plugin', parentSessionId: '', createdAt: 1, updatedAt: 4, turns: 1, tokens: turn({ output: 50 }).tokens, knownAmount: 0.03, unknownModels: [], lastTurn: turn({ amount: 0.03, output: 50, ts: 4 }) },
    },
  }
  const snapshot = buildUsageSnapshot(state, 'a')
  assert.equal(snapshot.conversation.amount, 0.01)
  assert.equal(snapshot.workspace.amount, 0.03)
  assert.equal(snapshot.today.amount, 0.06)
  assert.equal(snapshot.workspaces.length, 2)
})

test('child agents are counted once under their root conversation and split into details', () => {
  const state = {
    version: 1,
    date: '2026-09-05',
    updatedAt: '',
    sessions: {
      root: { id: 'root', cwd: 'D:\\Paper', parentSessionId: '', turns: 1, tokens: turn().tokens, knownAmount: 0.01, unknownModels: [], lastTurn: turn({ ts: 2 }) },
      child: { id: 'child', cwd: 'D:\\Paper', parentSessionId: 'root', turns: 1, tokens: turn().tokens, knownAmount: 0.02, unknownModels: [], lastTurn: turn({ amount: 0.02, ts: 3 }) },
      grandchild: { id: 'grandchild', cwd: 'D:\\Paper', parentSessionId: 'child', turns: 1, tokens: turn().tokens, knownAmount: 0.03, unknownModels: [], lastTurn: turn({ amount: 0.03, ts: 4 }) },
    },
  }
  const snapshot = buildUsageSnapshot(state, 'root')
  assert.equal(snapshot.conversation.amount, 0.06)
  assert.equal(snapshot.conversation.mainAmount, 0.01)
  assert.equal(snapshot.conversation.subagentAmount, 0.05)
  assert.equal(snapshot.conversation.sessionCount, 3)
  assert.equal(snapshot.lastTurn.sessionId, 'grandchild')
  assert.equal(snapshot.lastTurn.isSubagent, true)
})

test('unknown models preserve tokens but make the containing estimates unavailable', () => {
  const state = {
    version: 1,
    date: '2026-09-05',
    updatedAt: '',
    sessions: {
      a: { id: 'a', cwd: '', parentSessionId: '', turns: 1, tokens: turn().tokens, knownAmount: 0, unknownModels: ['future-model'], lastTurn: turn({ unknownModels: ['future-model'] }) },
    },
  }
  const snapshot = buildUsageSnapshot(state, 'a')
  assert.equal(snapshot.conversation.amount, null)
  assert.equal(snapshot.today.amount, null)
  assert.equal(snapshot.today.tokens.total, 60)
  assert.equal(snapshot.unassignedSessions, 1)
})

test('store persists atomically, restores data, and resets on a new day', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-conversations-'))
  const filename = path.join(directory, 'usage.json')
  let current = new Date(2026, 8, 5, 12)
  const store = createConversationUsageStore([filename], { now: () => current, logger: { warn() {} } })
  const recorded = store.recordTurn({ id: 'session-a', cwd: 'D:\\Paper', createdAt: 1 }, turn({ ts: current.getTime() }))
  assert.equal(recorded.persisted, true)
  assert.equal(recorded.snapshot.conversation.amount, 0.01)
  assert.equal(fs.existsSync(filename), true)

  const restored = createConversationUsageStore([filename], { now: () => current, logger: { warn() {} } })
  assert.equal(restored.snapshot('session-a').conversation.tokens.total, 60)

  current = new Date(2026, 8, 6, 12)
  const reset = restored.snapshot('session-a')
  assert.equal(reset.conversation, null)
  assert.equal(reset.today.tokens.total, 0)
})

test('latest turn retains model names for dialogue templates', () => {
  const state = {
    version: 1,
    date: '2026-09-05',
    updatedAt: '',
    sessions: {
      a: { id: 'a', cwd: '', parentSessionId: '', turns: 1, tokens: turn().tokens, knownAmount: 0.01, unknownModels: [], lastTurn: turn({ models: ['deepseek-v4-pro'], ts: 2 }) },
    },
  }
  assert.deepEqual(buildUsageSnapshot(state, 'a').lastTurn.models, ['deepseek-v4-pro'])
})

test('observed parent metadata keeps a child attributed before the parent finishes a turn', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-whale-conversations-'))
  const filename = path.join(directory, 'usage.json')
  const current = new Date(2026, 8, 5, 12)
  const store = createConversationUsageStore([filename], { now: () => current, logger: { warn() {} } })
  store.observeSession({ id: 'root', cwd: 'D:\\Paper', createdAt: 1 })
  store.recordTurn({ id: 'child', cwd: 'D:\\Paper', parentSessionId: 'root', createdAt: 2 }, turn({ amount: 0.02, ts: 3 }))
  const snapshot = store.snapshot('root')
  assert.equal(snapshot.conversation.sessionCount, 2)
  assert.equal(snapshot.conversation.amount, 0.02)
  assert.equal(snapshot.conversation.subagentAmount, 0.02)
})
