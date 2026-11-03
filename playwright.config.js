import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  use: {
    channel: process.env.WHALE_BROWSER_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
})
