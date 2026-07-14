import { test, expect } from '@playwright/test'

test('create a goal with modules', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('link', { name: 'Goals' }).click()
  await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'New goal' }).click()

  // Step 1: pick an area (seeded data ships a "Sport" area).
  await expect(page.getByText('New goal — step 1 of 3')).toBeVisible()
  await page.getByRole('button', { name: 'Sport', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 2: name + description.
  await expect(page.getByText('New goal — step 2 of 3')).toBeVisible()
  const goalName = `E2E Goal ${Date.now()}`
  await page.getByLabel('Name').fill(goalName)
  await page.getByRole('button', { name: 'Next' }).click()

  // Step 3: modules — keep the metrics/milestones defaults and add cards.
  await expect(page.getByText('New goal — step 3 of 3')).toBeVisible()
  await page.locator('label', { hasText: 'Cards' }).getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create goal' }).click()

  // Should land on the new goal's detail page with the toggled modules rendered.
  await expect(page.getByRole('heading', { name: goalName })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Metrics', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Milestones', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cards', exact: true })).toBeVisible()
})
