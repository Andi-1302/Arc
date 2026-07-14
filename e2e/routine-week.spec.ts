import { test, expect } from '@playwright/test'

test('add a routine and see it on the Week timetable', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Routines' }).click()

  await page.getByRole('button', { name: '+ New' }).click()
  const routineName = `E2E Routine ${Date.now()}`
  await page.getByLabel('Name').fill(routineName)
  // Leave the default daily schedule (all 7 days) so it shows up today regardless of weekday.
  await page.getByRole('button', { name: 'Save' }).click()

  const routineItem = page.locator('li', { hasText: routineName })
  await expect(routineItem).toBeVisible()
  await expect(routineItem).toContainText('Daily')

  await page.getByRole('link', { name: 'Week' }).click()
  await expect(page.getByRole('heading', { name: 'Week', exact: true })).toBeVisible()
  // The daily schedule puts it in every day's column — just confirm it shows up.
  await expect(page.getByTitle(routineName).first()).toBeVisible()
})
