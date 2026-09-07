import { test, expect } from '@playwright/test'

test('a timed one-off plan entry still appears in the Week grid', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Week' }).click()
  await expect(page.getByRole('heading', { name: 'Week', exact: true })).toBeVisible()

  // Click into the hour grid (skipping the 24px hour-label column) to open the add sheet
  // with a time already prefilled from the click position.
  const grid = page.locator('div.relative.mt-1.grid')
  const box = await grid.boundingBox()
  if (!box) throw new Error('Week hour grid not found')
  await page.mouse.click(box.x + 40, box.y + 100)

  const title = `E2E Timed ${Date.now()}`
  await page.getByLabel('Title').fill(title)
  await expect(page.getByLabel('Time (optional)')).not.toHaveValue('')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText(title, { exact: true })).toBeVisible()
})
