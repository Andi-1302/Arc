import { test, expect } from '@playwright/test'

test('a left/right metric logs two entries and shows the imbalance gap', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('link', { name: 'Goals' }).click()
  await page.getByText('Handstand push-up').click()

  await page.getByRole('button', { name: '+ Add metric' }).click()
  await page.getByRole('button', { name: 'Left / right' }).click()

  await page.getByLabel('Name').fill('E2E Grip')
  await page.getByLabel(/Unit/).fill('kg')
  await page.getByRole('button', { name: 'Save' }).click()

  // The new metric block has one input per side.
  const addRow = page.getByPlaceholder('Left', { exact: true }).locator('..')
  const dateInput = addRow.locator('input[type="date"]')

  // Entry 1 — gap = |50-40| / 50 * 100 = 20%.
  await dateInput.fill('2026-08-20')
  await addRow.getByPlaceholder('Left', { exact: true }).fill('50')
  await addRow.getByPlaceholder('Right', { exact: true }).fill('40')
  await addRow.getByRole('button', { name: 'Add' }).click()

  // Entry 2 — gap = |45-42| / 45 * 100 ≈ 7%. Later date so it is the latest.
  await dateInput.fill('2026-08-28')
  await addRow.getByPlaceholder('Left', { exact: true }).fill('45')
  await addRow.getByPlaceholder('Right', { exact: true }).fill('42')
  await addRow.getByRole('button', { name: 'Add' }).click()

  await expect(page.getByText(/Latest imbalance:/)).toContainText('7%')
  await expect(page.getByText(/gap 7%/)).toBeVisible()
  await expect(page.getByText(/gap 20%/)).toBeVisible()
  await expect(page.locator('.recharts-responsive-container')).toBeVisible()
  // one line per field, plus the derived imbalance line
  await expect(page.locator('.recharts-line')).toHaveCount(3)
})
