import { test as base, webkit, devices, type BrowserContext } from '@playwright/test'

/**
 * Playwright's normal `page`/`context` fixtures create a WebKit context via
 * `browser.newContext()`, which behaves like Safari Private Browsing: IndexedDB can't
 * store a Blob/File there AT ALL ("Error preparing Blob/File data to be stored in
 * object store"), no matter how the Blob was built. Confirmed directly against this
 * repo's installed Playwright WebKit build with a trivial `new Blob(['x'])` and raw
 * (no-Dexie) IndexedDB — it fails the same way a real backup import does. Switching to
 * `webkit.launchPersistentContext()` (a persistent, non-ephemeral profile) makes Blob
 * storage work, matching normal (non-private) Safari — so backup-webkit-blob.spec.ts
 * uses this fixture instead of the default one to actually exercise the app's fix
 * rather than permanently failing on an unrelated test-infrastructure limitation.
 */
export const test = base.extend<{ context: BrowserContext }>({
  // Playwright's fixture callback is conventionally named `use`, but that collides with
  // oxlint's react-hooks rule (it mistakes it for React's `use()` hook) — named `runTest`
  // here instead; it's the same positional callback Playwright passes in either way.
  context: async ({ baseURL }, runTest) => {
    // '' asks Playwright to manage a temporary profile directory (created and cleaned
    // up automatically), while still giving WebKit persistent (non-private) semantics.
    const context = await webkit.launchPersistentContext('', { ...devices['Desktop Safari'], baseURL })
    await runTest(context)
    await context.close()
  },
  page: async ({ context }, runTest) => {
    await runTest(context.pages()[0] ?? (await context.newPage()))
  },
})

export const expect = test.expect
