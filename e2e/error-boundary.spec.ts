import { test, expect } from '@playwright/test'

test('a crash in the Week view is contained to the Week view', async ({ page }) => {
  await page.goto('./week?e2e_crash=week')

  await expect(page.getByText('Something went wrong loading this page.')).toBeVisible()

  // Header and the header badge must survive a crash in a routed page.
  await expect(page.getByText('Blocks', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Consistency score')).toBeVisible()

  // Navigation must still work - the user isn't stuck on a dead page.
  await page.getByRole('link', { name: 'Today' }).click()
  await expect(page.getByRole('heading', { name: 'Checklist' })).toBeVisible()
})

test('a crash in the header badge is contained to the badge', async ({ page }) => {
  await page.goto('./?e2e_crash=badge')

  // The badge itself is gone (fallback renders nothing) but nothing else breaks.
  await expect(page.getByLabel('Consistency score')).not.toBeVisible()
  await expect(page.getByText('Blocks', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Checklist' })).toBeVisible()

  // Navigation still works, and Week (a sibling of the crashed badge) renders fine.
  await page.getByRole('link', { name: 'Week' }).click()
  await expect(page.getByRole('heading', { name: 'Week', exact: true })).toBeVisible()
})
