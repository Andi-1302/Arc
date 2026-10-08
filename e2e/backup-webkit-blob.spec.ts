import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from './fixtures/webkitPersistentContext'

// Guards against regressing restoreFromBackupJson() on WebKit in general — importing a
// real, large, multi-table backup (including a photo Blob) must succeed with no error
// dialog and a normal Settings page afterward. It runs against the `webkit-backup`
// Playwright project in playwright.config.ts (the only project this spec runs under),
// using a persistent WebKit context via ./fixtures/webkitPersistentContext — see that
// file for why: Playwright's default (ephemeral) WebKit context behaves like Safari
// Private Browsing and can't store a Blob via IndexedDB AT ALL, regardless of how the
// Blob was built ("Error preparing Blob/File data to be stored in object store"); the
// persistent context is what makes Blob storage work here, matching normal Safari.
//
// What this does NOT prove: base64ToBlob()'s atob-based rewrite (vs. its previous
// fetch(dataUrl).then(r => r.blob()) implementation) is specifically what fixed a real
// user's real-device Safari failure. Under this persistent-context fixture, BOTH the
// old fetch-based and the new atob-based construction succeed — so reverting to the
// fetch-based implementation would still pass this spec. The atob rewrite is kept as a
// reasonable, lower-risk change (fewer moving parts, matches a bug pattern reported
// elsewhere for other projects), not as something this test can regression-test
// specifically. See the base64ToBlob doc comment in src/lib/backup.ts for more.
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
