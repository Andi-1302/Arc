import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './fixtures/webkitPersistentContext'

// Reproduces (and guards against regressing) a WebKit-only import bug: base64ToBlob()
// used to build its Blob via fetch(dataUrl).then(r => r.blob()), which WebKit's
// IndexedDB can't structured-clone-store ("Error preparing Blob/File data to be stored
// in object store"). The exact same file imports fine on Chromium, so this only means
// anything when it actually runs under WebKit — see the `webkit-backup` Playwright
// project in playwright.config.ts, which is the only project this spec runs under.
// (It uses a persistent WebKit context via ./fixtures/webkitPersistentContext — see
// that file for why: Playwright's normal WebKit context can't store Blobs at all.)
//
// The fixture holds real personal data and is gitignored (/private-fixtures/), so it's
// never present in CI — this test is a no-op there.
const FIXTURE = path.resolve(process.cwd(), 'private-fixtures', 'blocks-backup-2026-08-31.json')

test.skip(!fs.existsSync(FIXTURE), 'private fixture not present')

test('importing the real backup fixture succeeds on WebKit, with no error dialog and a normal Settings page afterward', async ({
  page,
}) => {
  // Import fires confirm() (replace-all warning) immediately, then — once importBackup()
  // settles — alert()s either "Import complete…" (and reloads) or the caught error's
  // message (before the fix: the raw WebKit "Error preparing Blob/File data..." message,
  // with no reload). Settings never goes blank either way after this fix, so that alone
  // wouldn't distinguish success from failure — the dialog contents are the real signal,
  // which is why this waits for the specific second dialog rather than just the DOM.
  const dialogMessages: string[] = []
  page.on('dialog', (dialog) => {
    dialogMessages.push(dialog.message())
    void dialog.accept()
  })
  const completionDialog = page.waitForEvent('dialog', {
    predicate: (dialog) => /import complete|error|fail|invalid/i.test(dialog.message()),
    timeout: 20_000,
  })

  await page.goto('./')
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()

  await page.locator('input[type="file"]').setInputFiles(FIXTURE)
  await completionDialog

  expect(dialogMessages.some((m) => /import complete/i.test(m))).toBe(true)
  expect(dialogMessages.some((m) => /error|fail|invalid/i.test(m))).toBe(false)

  // On success this only resolves once the post-reload Settings page has (re-)mounted.
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Export backup (JSON)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import backup — replaces everything' })).toBeVisible()

  const bodyText = await page.locator('body').innerText()
  expect(bodyText.length).toBeGreaterThan(200)
})
