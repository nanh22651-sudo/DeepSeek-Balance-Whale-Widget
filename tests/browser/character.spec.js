import { test, expect } from '@playwright/test'
import { startHost } from './host.js'

let host
test.beforeAll(async () => { host = await startHost() })
test.afterAll(async () => { await host?.close() })

const actor = page => page.locator('.dshwv-character')
const bubble = page => page.locator('.dshwv-bubble-open')
const chat = page => page.locator('.dshwv-chat-btn').click({ force: true })

async function open(page, { id = 'custom-ordinary', text = '你好，鲸鱼娘。' } = {}) {
  const entry = { id, text, category: 'daily', rarity: 'normal', enabled: true, weight: 1 }
  await page.route('**/dsh-whale/dialogues.json', route => route.fulfill({
    json: { ok: true, config: { version: 1, dialogues: [entry] } },
  }))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/dsh-whale/dialogues.json')).then(r => r.finished()),
    page.goto(host.url, { waitUntil: 'load' }),
  ])
  await expect(actor(page)).toHaveAttribute('data-motion', 'idle')
  await expect.poll(() => page.locator('.dshwv-usage-sub').count()).toBeGreaterThan(0)
}

async function expectPose(page, motion, face) {
  const character = actor(page)
  await expect(character).toHaveAttribute('data-motion', motion)
  await expect(character).toHaveAttribute('data-face', face)
  const frame = character.locator('img[data-variant="' + face + '"]')
  await expect(frame).toBeVisible()
  await expect.poll(() => frame.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
}

async function whalePoint(page) {
  const box = await page.locator('.dshwv-img').boundingBox()
  return { x: box.x + box.width * 0.55, y: box.y + box.height * 0.65 }
}

test('idle blink briefly shows the closed frame and returns to the original portrait', async ({ page }) => {
  await open(page)
  await expectPose(page, 'idle', 'normal')
  await actor(page).evaluate(el => {
    window.blinkHistory = []
    new MutationObserver(() => {
      window.blinkHistory.push({ motion: el.dataset.motion, face: el.dataset.face, time: Date.now() })
    }).observe(el, { attributes: true, attributeFilter: ['data-motion', 'data-face'] })
  })
  // The blink delay is intentionally variable. Observe a complete cycle instead of assuming one random delay.
  await page.clock.runFor(10500)
  const history = await page.evaluate(() => window.blinkHistory)
  const blink = history.find(step => step.motion === 'blink' && step.face === 'closed')
  expect(blink).toBeDefined()
  const reopened = history.find(step => step.time > blink.time && step.face === 'normal')
  expect(reopened).toBeDefined()
  expect(reopened.time - blink.time).toBeLessThan(500)
  await expectPose(page, 'idle', 'normal')
})

test('hover requires a dwell, keeps controls anchored and yields to dragging', async ({ page }) => {
  await open(page)
  const point = await whalePoint(page)
  const positions = () => Promise.all(['.dshwv-img', '.dshwv-bubble', '.dshwv-chat-btn'].map(s => page.locator(s).boundingBox()))
  const initial = await positions()
  await page.mouse.move(point.x, point.y)
  await page.clock.runFor(100)
  await page.mouse.move(5, 5)
  await page.clock.runFor(500)
  await expectPose(page, 'idle', 'normal')
  await page.mouse.move(point.x, point.y)
  await page.clock.runFor(500)
  await expectPose(page, 'tilt', 'normal')
  expect(await positions()).toEqual(initial)
  await page.mouse.down()
  await page.mouse.move(point.x - 100, point.y - 70, { steps: 5 })
  await expect(page.locator('.dshwv-root')).toHaveClass(/dshwv-dragging/)
  await page.clock.runFor(10500)
  await expectPose(page, 'idle', 'normal')
  await page.mouse.up()
  await expect(page.locator('.dshwv-root')).not.toHaveClass(/dshwv-dragging/)
  await expect(bubble(page)).toHaveCount(0)
  await chat(page)
  await expectPose(page, 'nod', 'normal')
})

for (const entry of [
  { id: 'rare-004', text: '开心台词改了文案。', motion: 'nod', face: 'smile' },
  { id: 'daily-004', text: '我先打个盹。', motion: 'sleep', face: 'closed' },
  { id: 'custom-ordinary', text: 'DeepSleep...', motion: 'nod', face: 'normal' },
]) {
  test('chat reaction follows dialogue ID ' + entry.id, async ({ page }) => {
    await open(page, entry)
    await chat(page)
    await expect(bubble(page)).toContainText(entry.text)
    await expectPose(page, entry.motion, entry.face)
    if (entry.motion === 'sleep') {
      await page.clock.runFor(500)
      await expectPose(page, 'sleep', 'closed')
    }
    await page.clock.runFor(1100)
    await expectPose(page, 'idle', 'normal')
    await expect(bubble(page)).toContainText(entry.text)
  })
}

test('reduced motion cancels an active reaction while dialogue stays usable', async ({ page }) => {
  await open(page, { id: 'daily-004', text: '睡一会。' })
  await chat(page)
  await expectPose(page, 'sleep', 'closed')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.runFor(30)
  await expectPose(page, 'idle', 'normal')
  await chat(page)
  await expectPose(page, 'idle', 'normal')
  await expect(bubble(page)).toContainText('睡一会。')
  await page.clock.runFor(11000)
  await expectPose(page, 'idle', 'normal')
})

test('unavailable smile portrait falls back to the working base image', async ({ page }) => {
  await page.route('**/dsh-whale/face-smile.png*', route => route.fulfill({ status: 404, body: '' }))
  await open(page, { id: 'rare-004', text: '笑出声了。' })
  await chat(page)
  await expectPose(page, 'nod', 'normal')
  await expect(bubble(page)).toContainText('笑出声了。')
})
