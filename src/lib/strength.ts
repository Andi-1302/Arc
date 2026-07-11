import type { RoutineCheck } from '../db'
import { addDays, weekdayMon0 } from './date'

export const ALPHA = 0.05

/**
 * EWMA habit strength (spec §6). Replay starts at the routine's earliest
 * check (routines have no createdAt, so pre-interaction days can't be
 * scored) and only updates on scheduled days. Today is only folded in if
 * already checked, so the score doesn't dip before the day is over.
 */
export function computeRoutineStrength(
  schedule: number[],
  checks: Pick<RoutineCheck, 'date' | 'done'>[],
  today: string,
): number {
  if (checks.length === 0) return 0

  const sorted = [...checks].sort((a, b) => a.date.localeCompare(b.date))
  const doneByDate = new Map(sorted.map((c) => [c.date, c.done]))

  let value = 0
  let date = sorted[0].date
  while (date < today) {
    if (schedule.includes(weekdayMon0(date))) {
      const done = doneByDate.get(date) === true
      value = value + ALPHA * ((done ? 1 : 0) - value)
    }
    date = addDays(date, 1)
  }

  if (schedule.includes(weekdayMon0(today)) && doneByDate.get(today) === true) {
    value = value + ALPHA * (1 - value)
  }

  return value
}
