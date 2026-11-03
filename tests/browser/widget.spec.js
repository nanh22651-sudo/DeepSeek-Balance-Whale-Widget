import { test, expect } from '@playwright/test'
import { startHost } from './host.js'

const line = '鲸鱼娘测试台词'
const root = '.dshwv-root'
const openBubble = '.dshwv-bubble-open'
let host
test.beforeAll(async () => { host = await startHost() })
test.afterAll(async () => { await host?.close() })

async function openWidget(page, mode = 'web') {
  const balances = { ok: true, totalBalance: 12.34, currency: 'CNY', todayUsage: 0 }
  const sizes = { sound: false, balanceBubbleCloseMs: 2000, costBubbleCloseMs: 4000, dialogueBubbleCloseMs: 6000 }
  const dialogue = { id: 'fixture', text: line, enabled: true, rarity: 'normal', category: 'daily', weight: 1 }
  for (const [name, json] of Object.entries({
    balance: balances, size: sizes, dialogues: { ok: true, config: { dialogues: [dialogue] } },
  })) {
    await page.route('**/dsh-whale/' + name + '.json', route => route.fulfill({ json }))
  }
  await page.addInitScript(() => {
    window.EventSource = class extends EventTarget {
      constructor() { super(); window.testStream = this }
      close() {}
    }
    window.__ModuleLoader__ = { load({ factory }) {
      window.mountBridge = () => factory().apply({
        sessions: { list: { getSnapshot: () => ({ current: 'demo', byId: {} }), subscribe: () => () => {} } },
        effect(fn) { window.unmountBridge = fn() },
      })
      window.mountBridge()
    } }
  })
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.goto(host.url + (mode === 'desktop' ? '/?desktop' : '/'))
  if (mode !== 'web') await page.addScriptTag({ url: host.url + '/bridge.js' })
  await expect(page.locator(root)).toHaveCount(1)
  await expect(page.locator('.dshwv-text')).toContainText('12.34')
  await expect(page.locator('.dshwv-usage-sub').first()).toBeAttached()
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000))
}

for (const mode of ['web', 'desktop', 'both']) {
  test(mode + ' bootstraps a single usable widget', async ({ page }) => {
    await openWidget(page, mode)
    if (mode !== 'web') {
      await page.evaluate(() => window.unmountBridge())
      await expect(page.locator(root)).toHaveCount(0)
      await page.evaluate(() => window.mountBridge())
      await expect(page.locator(root)).toHaveCount(1)
    }
    await page.getByRole('button', { name: '和鲸鱼娘聊天', exact: true }).first().click({ force: true })
    await expect(page.locator(openBubble)).toContainText(line)
  })
}

const chat = page => page.locator('.dshwv-chat-btn').click({ force: true })
async function balance(page) {
  const img = await page.locator('.dshwv-img').boundingBox()
  await page.mouse.click(img.x + img.width * 0.55, img.y + img.height * 0.65)
  await expect(page.locator(openBubble)).toContainText('12.34')
}

test('quick chat opens with dialogue from the first visible content', async ({ page }) => {
  await openWidget(page)
  await page.evaluate(() => {
    const bubble = document.querySelector('.dshwv-bubble')
    const text = bubble.querySelector('.dshwv-text')
    window.visibleTexts = []
    const record = () => {
      if (bubble.classList.contains('dshwv-bubble-open')) window.visibleTexts.push(text.innerText)
    }
    new MutationObserver(record).observe(bubble, { attributes: true, subtree: true, childList: true, characterData: true })
    // Capture the opening instant too, including a wrong label replaced in the same task.
    const open = bubble.classList.add.bind(bubble.classList)
    bubble.classList.add = (...args) => { open(...args); record() }
  })
  await chat(page)
  await page.clock.runFor(1000)
  const history = await page.evaluate(() => window.visibleTexts)
  expect(history.length).toBeGreaterThan(0)
  for (const text of history) expect(text.trim()).toBe(line)
})

async function closesAfter(page, ms) {
  await page.clock.runFor(ms - 1)
  await expect(page.locator(openBubble)).toHaveCount(1)
  await page.clock.runFor(1)
  await expect(page.locator(openBubble)).toHaveCount(0)
}

test('balance, turn cost and dialogue close at 2, 4 and 6 seconds', async ({ page }) => {
  await openWidget(page)
  await balance(page)
  await closesAfter(page, 2000)
  await page.evaluate(() => {
    const usage = { ok: true, selectedSessionId: 'demo', lastTurn: { sessionId: 'demo', turn: 1, amount: 0.42, tokens: { total: 100 } } }
    window.testStream.dispatchEvent(new MessageEvent('usage', { data: JSON.stringify(usage) }))
  })
  await expect(page.locator(openBubble)).toContainText('0.42')
  await closesAfter(page, 4000)
  await chat(page)
  await expect(page.locator(openBubble)).toContainText(line)
  await closesAfter(page, 6000)
})

test('switching balance to chat gives dialogue a fresh six seconds', async ({ page }) => {
  await openWidget(page)
  await balance(page)
  await page.clock.runFor(1000)
  await chat(page)
  await page.clock.runFor(1000)
  await expect(page.locator(openBubble)).toContainText(line)
  await closesAfter(page, 5000)
})

test('duration controls and dialogue preview operate on the displayed bubble', async ({ page }) => {
  await openWidget(page)
  await page.locator('.dshwv-menu-btn').click({ force: true })
  const menu = page.locator('.dshwv-menu')
  for (const [label, seconds] of [['余额气泡时长', '2'], ['费用气泡时长', '4'], ['聊天台词时长', '6']]) {
    const input = menu.locator('.dshwv-menu-row').filter({ hasText: label }).getByRole('spinbutton')
    await expect(input).toHaveValue(seconds)
    if (label === '聊天台词时长') await input.fill('0')
  }
  await expect(menu.getByRole('option', { name: '梁文峰谷' })).toHaveCount(0)
  await menu.getByRole('button', { name: '管理台词' }).click()
  const card = page.locator('.dshwv-dialogue-card').first()
  await card.getByRole('textbox').fill('预览中的新台词')
  await card.getByRole('button', { name: '预览', exact: true }).click()
  await expect(page.locator(openBubble)).toContainText('预览中的新台词')
  await page.clock.runFor(7000)
  await expect(page.locator(openBubble)).toContainText('预览中的新台词')
})
