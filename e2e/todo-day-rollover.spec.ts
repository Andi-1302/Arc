import { test, expect } from '@playwright/test'

test('a completed todo is gone from Today the next day but still listed under Done', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-07T09:00:00') })
  await page.goto('./')

  const todoTitle = `E2E Rollover ${Date.now()}`
  const quickAdd = page.getByPlaceholder('Quick-add a todo')
  await quickAdd.fill(todoTitle)
  await quickAdd.press('Enter')

  const todayRow = page.getByRole('listitem').filter({ hasText: todoTitle })
  await expect(todayRow).toBeVisible()

  await todayRow.getByRole('button', { name: `Complete ${todoTitle}` }).click()
  // Stays visible (checked) for the rest of the day it was completed.
  await expect(todayRow).toBeVisible()
  await expect(todayRow.getByRole('button', { name: `Reopen ${todoTitle}` })).toHaveAttribute('aria-pressed', 'true')

  // Advance to the next day and reload so `useToday` picks up the new date.
  await page.clock.setFixedTime(new Date('2026-09-08T09:00:00'))
  await page.reload()

  await expect(page.getByRole('listitem').filter({ hasText: todoTitle })).toHaveCount(0)

  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Todos ›' }).click()
  const doneSection = page.locator('section', { hasText: 'Done' })
  await expect(doneSection.getByText(todoTitle)).toBeVisible()
})
