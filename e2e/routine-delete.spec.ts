import { test, expect } from '@playwright/test'

test('deleting a routine leaves the Week timetable and header badge rendering correctly', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw new Error(`Uncaught page error: ${err.message}`)
  })

  await page.goto('./')
  await expect(page.getByLabel('Consistency score')).toBeVisible()

  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Routines' }).click()

  await page.getByRole('button', { name: '+ New' }).click()
  const routineName = `E2E Delete ${Date.now()}`
  await page.getByLabel('Name').fill(routineName)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('li', { hasText: routineName })).toBeVisible()

  // Confirm it before deleting (so deletion is a real regression, not a no-op).
  await page.getByRole('link', { name: 'Week' }).click()
  await expect(page.getByTitle(routineName).first()).toBeVisible()

  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Routines' }).click()
  page.once('dialog', (d) => d.accept())
  await page.locator('li', { hasText: routineName }).click()
  await page.getByRole('button', { name: 'Delete routine' }).click()
  await expect(page.locator('li', { hasText: routineName })).not.toBeVisible()

  // Both the Week timetable and the header badge must still render, without needing a tab switch to recover.
  await page.getByRole('link', { name: 'Week' }).click()
  await expect(page.getByRole('heading', { name: 'Week', exact: true })).toBeVisible()
  await expect(page.getByLabel('Consistency score')).toBeVisible()
  await expect(page.getByTitle(routineName)).toHaveCount(0)
})
