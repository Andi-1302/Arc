import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so unit tests don't spin up the PWA/Tailwind/React
// plugin chain. Tests here are logic-only (no DOM); a test that needs IndexedDB pulls in
// `fake-indexeddb/auto` itself (see backup.test.ts).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
