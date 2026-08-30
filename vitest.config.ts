import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so unit tests don't spin up the PWA/Tailwind/React
// plugin chain. Unit tests here are pure logic — no DOM, no IndexedDB.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
