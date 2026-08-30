import { test, expect } from '@playwright/test'
import path from 'node:path'

const FIXTURE = path.join(process.cwd(), 'e2e', 'fixtures', 'backup-v1.json')

test('a version 1 backup imported through Settings restores its data', async ({ page }) => {
  // Import fires confirm() (replace-all warning) and alert() (completion), then reloads.
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('./')
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()

  await page.locator('input[type="file"]').setInputFiles(FIXTURE)

  // After the reload, the seeded goals are gone and the backup's goal is on the Goals screen.
  await page.getByRole('link', { name: 'Goals' }).click()
  await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible()
  await expect(page.getByText('Legacy Marathon Goal')).toBeVisible()
  await expect(page.getByText('Handstand push-up')).toHaveCount(0)
})
