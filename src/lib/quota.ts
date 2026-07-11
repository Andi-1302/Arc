import type { Routine, RoutineCheck } from '../db'
import { addDays, endOfIsoWeek, startOfIsoWeek, weekdayMon0 } from './date'

export interface WeeklyQuota {
  completed: number
  scheduled: number
  ratio: number
}

/** Process quota (spec §4.4): completed / scheduled routine instances for the ISO week. */
export function computeWeeklyQuota(
  routines: Routine[],
  checks: RoutineCheck[],
  scoredRoutineIds: string[],
  today: string,
): WeeklyQuota {
  const weekStart = startOfIsoWeek(today)
  const weekEnd = endOfIsoWeek(today)
  const scored = routines.filter((r) => scoredRoutineIds.includes(r.id))
  const doneSet = new Set(checks.filter((c) => c.done).map((c) => `${c.routineId}|${c.date}`))

  let scheduled = 0
  let completed = 0
  for (const routine of scored) {
    let date = weekStart
    while (date <= weekEnd) {
      if (routine.schedule.includes(weekdayMon0(date))) {
        scheduled++
        if (doneSet.has(`${routine.id}|${date}`)) completed++
      }
      date = addDays(date, 1)
    }
  }

  return { completed, scheduled, ratio: scheduled === 0 ? 0 : completed / scheduled }
}
