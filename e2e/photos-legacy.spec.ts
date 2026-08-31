import { test, expect } from '@playwright/test'

// 1x1 PNG — enough for compressImageToBlob to decode and re-encode.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('a photo with no pose still renders and can be sorted', async ({ page }) => {
  await page.goto('./')

  // Upload through the Stats dashboard, which attaches no pose — the "legacy" shape.
  await page.getByRole('link', { name: 'Stats' }).click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'progress.png', mimeType: 'image/png', buffer: PNG })

  // It renders on the goal's Photos section, grouped as Unsorted.
  await page.getByRole('link', { name: 'Goals' }).click()
  await page.getByText('Posture & left arm').click()
  await expect(page.getByRole('heading', { name: 'Photos' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Unsorted (1)' })).toBeVisible()
  const grid = page.locator('.grid').filter({ has: page.locator('img') }).last()
  await expect(grid.locator('img').first()).toBeVisible()

  // One tap assigns a pose and clears it from Unsorted.
  await page.getByRole('button', { name: 'Tag as front' }).first().click()
  await expect(page.getByRole('button', { name: 'Unsorted (1)' })).toHaveCount(0)
})
