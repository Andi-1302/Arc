import { test, expect } from '@playwright/test'

test('complete a daily check-in on the Today tab', async ({ page }) => {
  await page.goto('./')

  // Rate the day.
  await page.getByRole('button', { name: '8', exact: true }).click()
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveClass(/bg-accent/)

  // Add a note.
  const note = page.getByPlaceholder('Notes (optional)')
  await note.fill('E2E check-in note')
  await note.blur()

  // Add gratitude entries. Each field saves (and re-syncs from IndexedDB) on blur, so give that
  // round-trip a moment to settle before moving to the next field — otherwise a slow save can land
  // after the next field's edit and clobber it with a stale snapshot.
  await page.getByRole('button', { name: /grateful for/i }).click()
  const gratitude1 = page.getByPlaceholder('Grateful for #1')
  const gratitude2 = page.getByPlaceholder('Grateful for #2')
  const gratitude3 = page.getByPlaceholder('Grateful for #3')

  await gratitude1.fill('Coffee')
  await gratitude1.blur()
  await page.waitForTimeout(200)

  await gratitude2.fill('Sunshine')
  await gratitude2.blur()
  await page.waitForTimeout(200)

  await gratitude3.fill('Friends')
  await gratitude3.blur()
  await page.waitForTimeout(200)

  // Reload and confirm everything persisted to IndexedDB.
  await page.reload()
  await expect(page.getByRole('button', { name: '8', exact: true })).toHaveClass(/bg-accent/)
  await expect(page.getByPlaceholder('Notes (optional)')).toHaveValue('E2E check-in note')
  await expect(page.getByPlaceholder('Grateful for #1')).toHaveValue('Coffee')
  await expect(page.getByPlaceholder('Grateful for #2')).toHaveValue('Sunshine')
  await expect(page.getByPlaceholder('Grateful for #3')).toHaveValue('Friends')
})
