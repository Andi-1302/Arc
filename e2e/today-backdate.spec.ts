import { test, expect } from '@playwright/test'

test('back-dating a routine check from the Today date navigator persists after navigating away', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('button', { name: 'Previous day' }).click()

  const routineItem = page.getByRole('listitem').filter({ hasText: 'Posture routine' })
  const checkButton = routineItem.getByRole('button').first()
  await checkButton.click()
  await expect(checkButton).toHaveAttribute('aria-pressed', 'true')

  // Leave the Today screen and come back — the date navigator should reset to today,
  // so step back one day again to land on the same date we just checked.
  await page.getByRole('link', { name: 'Week' }).click()
  await page.getByRole('link', { name: 'Today' }).click()
  await page.getByRole('button', { name: 'Previous day' }).click()

  const routineItemAgain = page.getByRole('listitem').filter({ hasText: 'Posture routine' })
  const checkButtonAgain = routineItemAgain.getByRole('button').first()
  await expect(checkButtonAgain).toHaveAttribute('aria-pressed', 'true')
})
