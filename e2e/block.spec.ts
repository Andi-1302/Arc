import { test, expect } from '@playwright/test'

// The seed data ships one already-active block covering today, so "creating" a
// new block goes through the same close-current -> start-next flow the app
// exposes in Cycles. Closing it drops some routines' priority, which triggers
// a confirm() dialog — auto-accept all dialogs for this flow.
test('create a block with a focus goal', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto('./')
  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Cycles' }).click()

  await expect(page.getByText('Block 1 — Base + Arm Rehab')).toBeVisible()
  await page.getByRole('button', { name: 'Close block' }).click()

  await expect(page.getByText('Close "Block 1 — Base + Arm Rehab"')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  await page.getByLabel('Reflection').fill('E2E block reflection')
  await page.getByRole('button', { name: 'Close block & start next' }).click()

  await expect(page.getByText('Start next block')).toBeVisible()
  const blockName = `E2E Block ${Date.now()}`
  await page.getByLabel('Name').fill(blockName)
  await page.getByRole('button', { name: 'Endurance / marathon' }).click()
  await page.getByRole('button', { name: 'Save' }).click()

  // Wait for the sheet to fully close (createBlock + the pause-routines confirm both resolve) before
  // asserting on text that also appears in the sheet's own (now-selected) focus-goal button.
  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)

  // Back on Cycles with the new block active and showing its focus goal.
  await expect(page.getByRole('heading', { name: blockName })).toBeVisible()
  await expect(page.getByText('Endurance / marathon')).toBeVisible()
  await expect(page.getByText('Block 1 — Base + Arm Rehab')).toBeVisible()
  await expect(page.getByText('E2E block reflection')).toBeVisible()
})
