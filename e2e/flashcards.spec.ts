import { test, expect } from '@playwright/test'

test('create and review a flashcard through the SM-2 flow', async ({ page }) => {
  await page.goto('./')

  // Create a goal dedicated to cards so the review queue is predictable.
  await page.getByRole('link', { name: 'Goals' }).click()
  await page.getByRole('button', { name: 'New goal' }).click()
  await page.getByRole('button', { name: 'Sport', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()

  const goalName = `E2E Cards Goal ${Date.now()}`
  await page.getByLabel('Name').fill(goalName)
  await page.getByRole('button', { name: 'Next' }).click()

  // Only the cards module — uncheck the metrics/milestones defaults.
  await page.locator('label', { hasText: 'Metrics' }).getByRole('checkbox').uncheck()
  await page.locator('label', { hasText: 'Milestones' }).getByRole('checkbox').uncheck()
  await page.locator('label', { hasText: 'Cards' }).getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Create goal' }).click()

  await expect(page.getByRole('heading', { name: goalName })).toBeVisible()

  // Add a card.
  await page.getByRole('button', { name: '+ Add' }).click()
  await page.getByLabel('Front').fill('Capital of France')
  await page.getByLabel('Back').fill('Paris')
  await page.getByRole('button', { name: 'Save' }).click()

  // Wait for the add-card sheet to close before checking the card list, since its own textarea
  // still contains "Capital of France" text during the closing transition.
  await expect(page.getByLabel('Front')).toHaveCount(0)
  await expect(page.getByText('Capital of France')).toBeVisible()
  await expect(page.getByText(/^Due \d{4}-\d{2}-\d{2}$/)).toBeVisible()

  // Jump into Review and grade the card.
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Review ›' }).click()

  const goalRow = page.getByRole('button', { name: goalName })
  await expect(goalRow).toContainText('1 due')
  await goalRow.click()

  await expect(page.getByText('Capital of France')).toBeVisible()
  await expect(page.getByText('Paris')).not.toBeVisible()
  await page.getByRole('button', { name: 'Reveal' }).click()
  await expect(page.getByText('Paris')).toBeVisible()
  await page.getByRole('button', { name: 'Good' }).click()

  // Grading "Good" schedules the card for tomorrow, so it drops out of today's due list.
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible()
  await expect(goalRow).toBeDisabled()
})
