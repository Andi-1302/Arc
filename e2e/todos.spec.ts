import { test, expect } from '@playwright/test'

test('quick-add a todo on Today and complete it from the full list', async ({ page }) => {
  await page.goto('./')

  const todoTitle = `E2E Todo ${Date.now()}`
  const quickAdd = page.getByPlaceholder('Quick-add a todo')
  await quickAdd.fill(todoTitle)
  await quickAdd.press('Enter')

  const todayRow = page.getByRole('listitem').filter({ hasText: todoTitle })
  await expect(todayRow).toBeVisible()

  await todayRow.getByRole('button', { name: `Complete ${todoTitle}` }).click()
  await expect(todayRow).toBeHidden()

  await page.getByRole('link', { name: 'More' }).click()
  await page.getByRole('link', { name: 'Todos ›' }).click()
  await expect(page.getByRole('heading', { name: 'Todos', exact: true })).toBeVisible()

  const doneSection = page.locator('section', { hasText: 'Done' })
  await expect(doneSection.getByText(todoTitle)).toBeVisible()

  const openSection = page.locator('section', { hasText: 'Open' })
  await expect(openSection.getByText(todoTitle)).toHaveCount(0)
})
