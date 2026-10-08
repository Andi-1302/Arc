import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}/Arc/`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // backup-webkit-blob.spec.ts only means anything under WebKit (see webkit-backup below).
      testIgnore: '**/backup-webkit-blob.spec.ts',
    },
    {
      name: 'webkit-backup',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/backup-webkit-blob.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
