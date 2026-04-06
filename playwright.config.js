import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'static.spec.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:8899',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 8899 --open false',
    url: 'http://127.0.0.1:8899',
    reuseExistingServer: true,
    timeout: 120_000
  }
})
