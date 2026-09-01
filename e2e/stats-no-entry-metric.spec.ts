import { test, expect } from '@playwright/test'

test('a metric with no entries can be pinned from Stats and moves to the top', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Stats' }).click()

  const dash = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Dashboard' }) })
  await dash.getByRole('button', { name: 'Sport', exact: true }).click()

  // "Wall HSPU reps" is on a goal outside the current block and has zero entries —
  // it is reachable only under "Show all", rendered as a compact row (no chart).
  await dash.getByRole('button', { name: /^Show all \(\d+\)$/ }).click()
  const chip = dash.getByRole('button', { name: /Dashboard visibility for Wall HSPU reps/ })
  await expect(chip).toBeVisible()
  await chip.click()
  await page.getByRole('button', { name: 'Always show', exact: true }).click()

  // It moves to the top of the active list, now marked "Pinned".
  const firstRow = dash.getByTestId('dashboard-active').locator('> div').first()
  await expect(firstRow).toContainText('Wall HSPU reps')
  await expect(firstRow).toContainText('No entries yet')
  await expect(firstRow.getByRole('button', { name: /Dashboard visibility for Wall HSPU reps/ })).toContainText(
    'Pinned',
  )
})
