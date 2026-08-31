import { test, expect } from '@playwright/test'

test('a general metric can be logged from the Stats page and its chart renders', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Stats' }).click()

  // The "General metrics" section holds the goalId-null metrics (seeded: Body weight, Daily rating).
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'General metrics' }) })
  const bodyWeight = section.getByRole('heading', { name: /Body weight/ }).locator('..').locator('..')

  await expect(bodyWeight.getByText('No entries yet.')).toBeVisible()

  await bodyWeight.getByPlaceholder('Value').fill('79')
  await bodyWeight.getByRole('button', { name: 'Add' }).click()

  // The entry lands and the chart draws.
  await expect(bodyWeight.getByText('No entries yet.')).toHaveCount(0)
  await expect(bodyWeight.locator('.recharts-responsive-container')).toBeVisible()
  await expect(bodyWeight.getByText('79', { exact: false }).first()).toBeVisible()
})
