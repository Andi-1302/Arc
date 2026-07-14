import type { Routine, RoutineCheck } from '../db'
import { addDays, endOfIsoWeek, startOfIsoWeek, weekdayMon0 } from './date'

/** Average of the weekly process quota ratio across each ISO week the block spans (weeks with nothing scheduled are skipped). */
export function averageProcessQuota(
  routines: Routine[],
  checks: RoutineCheck[],
  scoredRoutineIds: string[],
  startDate: string,
  endDate: string,
): number {
  const ratios: number[] = []
  const lastWeek = startOfIsoWeek(endDate)
  let week = startOfIsoWeek(startDate)
  while (week <= lastWeek) {
    const quota = computeWeeklyQuota(routines, checks, scoredRoutineIds, week)
    if (quota.scheduled > 0) ratios.push(quota.ratio)
    week = addDays(week, 7)
  }
  return ratios.length === 0 ? 0 : ratios.reduce((a, b) => a + b, 0) / ratios.length
}

export interface WeeklyQuota {
  completed: number
  scheduled: number
  ratio: number
}

export interface CardsScheduleToday {
  due: number
  reviewedToday: number
}

/**
 * Process quota (spec §4.4): completed / scheduled routine instances for the ISO week.
 * Due flashcards count as one schedulable item for the `today` day specifically (checked = review
 * session completed) — only ever knowable for the actual current day, never reconstructed for past days.
 */
export function computeWeeklyQuota(
  routines: Routine[],
  checks: RoutineCheck[],
  scoredRoutineIds: string[],
  today: string,
  cardsToday?: CardsScheduleToday,
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

  if (cardsToday && (cardsToday.due > 0 || cardsToday.reviewedToday > 0)) {
    scheduled++
    if (cardsToday.due === 0) completed++
  }

  return { completed, scheduled, ratio: scheduled === 0 ? 0 : completed / scheduled }
}
