import type { PlanEntry } from '../db'
import { weekdayMon0 } from './date'

export function entriesForDate(entries: PlanEntry[], date: string): PlanEntry[] {
  const weekday = weekdayMon0(date)
  return entries.filter((e) => (e.recurrence === 'once' ? e.date === date : e.weekday === weekday))
}

/** Timed items first (ascending), then untimed items, alphabetical within each group. */
export function sortChecklist<T extends { title: string; time?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const t = (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
    return t !== 0 ? t : a.title.localeCompare(b.title)
  })
}
