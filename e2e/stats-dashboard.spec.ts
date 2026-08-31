import { test, expect } from '@playwright/test'

test('hiding a chart from the Stats dashboard moves it under "Show all"', async ({ page }) => {
  await page.goto('./')

  // Give a prioritised-goal metric some data so it shows on the dashboard by default.
  await page.getByRole('link', { name: 'Goals' }).click()
  await page.getByText('Endurance / marathon').click()

  const kmBlock = page.getByRole('heading', { name: /Weekly km/ }).locator('..').locator('..')
  await kmBlock.getByPlaceholder('Value').fill('12')
  await kmBlock.getByRole('button', { name: 'Add' }).click()

  await page.getByRole('link', { name: 'Stats' }).click()
  const kmChart = page.getByRole('heading', { name: 'Weekly km', exact: true })
  await expect(kmChart).toBeVisible()

  // Hide it via the per-chart overflow control.
  await page.getByRole('button', { name: 'Chart options for Weekly km' }).click()
  await page.getByRole('button', { name: 'Never', exact: true }).click()

  await expect(kmChart).toHaveCount(0)

  // It's now retrievable under "Show all".
  await page.getByRole('button', { name: /^Show all \(1\)$/ }).click()
  await expect(kmChart).toBeVisible()
})
