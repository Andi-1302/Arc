import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

test('export a backup and import it back', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('./')
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()

  const questionInput = page.getByLabel('Question')
  await questionInput.fill('E2E Original Question')
  await questionInput.blur()

  // Export a backup capturing the "original" state.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup (JSON)' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^blocks-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const backupPath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'blocks-e2e-')), 'backup.json')
  await download.saveAs(backupPath)

  const backupContents = await fs.readFile(backupPath, 'utf-8')
  const backup = JSON.parse(backupContents)
  expect(backup.data.settings[0].dailyQuestion).toBe('E2E Original Question')
  expect(backup.data.areas.length).toBeGreaterThan(0)

  // Change state so we can tell import actually restored the export.
  await questionInput.fill('E2E Changed Question')
  await questionInput.blur()
  await expect(questionInput).toHaveValue('E2E Changed Question')

  // Import the backup file back in — confirm() and the completion alert() are auto-accepted above,
  // which triggers a page reload. The assertion below auto-retries across that reload.
  await page.locator('input[type="file"]').setInputFiles(backupPath)
  await expect(page.getByLabel('Question')).toHaveValue('E2E Original Question', { timeout: 15_000 })
})
