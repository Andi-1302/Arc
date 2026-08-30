import { test, expect } from '@playwright/test'

// Regression guard for ~2 months of existing single-value metric entries: a seeded
// legacy metric (no `fields`) must still accept a new entry and chart it, unchanged
// by the multi-field metric work.
test('a seeded single-value metric still charts after adding an entry', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('link', { name: 'Goals' }).click()
  await page.getByText('Handstand push-up').click()

  await expect(page.getByRole('heading', { name: /Wall HSPU reps/ })).toBeVisible()
  await expect(page.getByText('No entries yet.')).toBeVisible()

  // The add row: date input, value input, Add button — scope to it via the value input's parent.
  const addRow = page.getByPlaceholder('Value').locator('..')
  await page.getByPlaceholder('Value').fill('12')
  await addRow.getByRole('button', { name: 'Add' }).click()

  // Chart still renders for legacy single-value data, and the entry is listed.
  await expect(page.locator('.recharts-responsive-container')).toBeVisible()
  await expect(page.getByText('No entries yet.')).toHaveCount(0)
  await expect(page.getByText('12', { exact: false }).first()).toBeVisible()
})
