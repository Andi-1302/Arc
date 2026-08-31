import { test, expect } from '@playwright/test'

test('create a template, log a session from it, and see it in history', async ({ page }) => {
  await page.goto('./')

  // A goal with the workouts module.
  await page.getByRole('link', { name: 'Goals' }).click()
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.getByRole('button', { name: 'Sport', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  const goalName = `E2E Lifts ${Date.now()}`
  await page.getByLabel('Name').fill(goalName)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.locator('label', { hasText: 'Workouts' }).getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create goal' }).click()

  await expect(page.getByRole('heading', { name: goalName })).toBeVisible()

  // Build a template with one exercise.
  await page.getByRole('button', { name: '+ New template' }).click()
  await page.getByLabel('Template name').fill('E2E Push')
  await page.getByPlaceholder('Exercise name').fill('Bench')
  await page.getByLabel('Reps').fill('8')
  await page.getByLabel('Weight (kg)').fill('60')
  await page.getByRole('button', { name: 'Save template' }).click()

  await expect(page.getByText('E2E Push')).toBeVisible()

  // Log a session from it — the rows are prefilled 60 kg × 8.
  await page.getByRole('button', { name: 'Log workout' }).click()
  await expect(page.getByRole('heading', { name: 'Log · E2E Push' })).toBeVisible()

  await page.getByRole('button', { name: 'Mark Bench set 1 done' }).click()
  await page.getByRole('button', { name: 'Mark Bench set 2 done' }).click()
  await page.getByRole('button', { name: 'Mark Bench set 3 done' }).click()

  // Card auto-collapses once every set is done — the per-set inputs are gone.
  await expect(page.getByRole('button', { name: 'Mark Bench set 1 done' })).toHaveCount(0)
  await expect(page.getByText(/60 kg/)).toBeVisible()

  await page.getByRole('button', { name: 'Save workout' }).click()

  // The session is in the goal's history with the right set count.
  await expect(page.getByRole('heading', { name: goalName })).toBeVisible()
  await expect(page.getByText(/3 sets/)).toBeVisible()

  // Expand it and confirm the exercise is there.
  await page.getByText(/3 sets/).click()
  await expect(page.getByText(/set 1: 60 kg/)).toBeVisible()
  await expect(page.getByText('Bench').first()).toBeVisible()
})
