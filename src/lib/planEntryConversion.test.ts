import { describe, expect, it } from 'vitest'
import type { PlanEntry, PlanEntryCheck } from '../db'
import { buildTodosFromPlanEntries, previewConversion } from './planEntryConversion'

function entry(patch: Partial<PlanEntry> & Pick<PlanEntry, 'id' | 'title'>): PlanEntry {
  return { recurrence: 'once', createdAt: '2026-01-01T00:00:00.000Z', ...patch }
}

describe('previewConversion', () => {
  it('counts and names only untimed one-off entries, leaving timed and weekly entries out', () => {
    const entries: PlanEntry[] = [
      entry({ id: 'once-untimed-1', title: 'Renew passport', date: '2026-09-10' }),
      entry({ id: 'once-untimed-2', title: 'Call the dentist', date: '2026-09-11' }),
      entry({ id: 'once-timed', title: 'Half marathon', date: '2026-09-12', time: '09:00' }),
      entry({ id: 'weekly-untimed', title: 'Meal prep', recurrence: 'weekly', weekday: 6 }),
    ]
    expect(previewConversion(entries)).toEqual({
      count: 2,
      titles: ['Renew passport', 'Call the dentist'],
    })
  })

  it('is empty when there is nothing convertible', () => {
    expect(previewConversion([])).toEqual({ count: 0, titles: [] })
  })
})

describe('buildTodosFromPlanEntries', () => {
  it('converts a checked entry to a done todo carrying its due date and area', () => {
    const entries: PlanEntry[] = [
      entry({ id: 'e1', title: 'Renew passport', date: '2026-09-10', areaId: 'area-admin' }),
    ]
    const checks: PlanEntryCheck[] = [{ id: 'c1', planEntryId: 'e1', date: '2026-09-10', done: true }]

    const todos = buildTodosFromPlanEntries(entries, checks, () => 'todo-1')

    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject({
      id: 'todo-1',
      title: 'Renew passport',
      dueDate: '2026-09-10',
      areaId: 'area-admin',
      done: true,
      doneAt: '2026-09-10',
    })
  })

  it('converts an unchecked entry to an open todo with no doneAt', () => {
    const entries: PlanEntry[] = [entry({ id: 'e2', title: 'Call the dentist', date: '2026-09-11' })]

    const todos = buildTodosFromPlanEntries(entries, [], () => 'todo-2')

    expect(todos).toHaveLength(1)
    expect(todos[0]).toMatchObject({
      id: 'todo-2',
      title: 'Call the dentist',
      dueDate: '2026-09-11',
      done: false,
      doneAt: undefined,
    })
  })

  it('ignores timed and weekly entries entirely', () => {
    const entries: PlanEntry[] = [
      entry({ id: 'timed', title: 'Half marathon', date: '2026-09-12', time: '09:00' }),
      entry({ id: 'weekly', title: 'Meal prep', recurrence: 'weekly', weekday: 6 }),
    ]

    expect(buildTodosFromPlanEntries(entries, [], () => 'unused')).toEqual([])
  })
})
