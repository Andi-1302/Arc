import type { Routine, RoutineCheck } from '../db'
import { addDays, startOfIsoWeek, todayISO, weekdayMon0 } from './date'

export interface HeatmapDay {
  date: string
  scheduled: number
  completed: number
}

export type HeatmapLevel = 'none' | 'empty' | 'low' | 'mid' | 'high' | 'full'

/** Weeks (Mon-first columns) of scheduled/completed routine counts, spanning ~weeksBack up to today. */
export function buildHeatmapWeeks(routines: Routine[], checks: RoutineCheck[], weeksBack: number): HeatmapDay[][] {
  const today = todayISO()
  const doneSet = new Set(checks.filter((c) => c.done).map((c) => `${c.routineId}|${c.date}`))
  const active = routines.filter((r) => r.active)
  const start = startOfIsoWeek(addDays(today, -7 * (weeksBack - 1)))

  const weeks: HeatmapDay[][] = []
  let weekStart = start
  while (weekStart <= today) {
    const week: HeatmapDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)
      if (date > today) break
      const weekday = weekdayMon0(date)
      const scheduledRoutines = active.filter((r) => r.schedule.includes(weekday))
      const completed = scheduledRoutines.filter((r) => doneSet.has(`${r.id}|${date}`)).length
      week.push({ date, scheduled: scheduledRoutines.length, completed })
    }
    weeks.push(week)
    weekStart = addDays(weekStart, 7)
  }
  return weeks
}

/** 'none' = nothing scheduled that day (no signal either way); otherwise a 4-step completion-ratio bucket. */
export function heatmapLevel(day: HeatmapDay): HeatmapLevel {
  if (day.scheduled === 0) return 'none'
  const ratio = day.completed / day.scheduled
  if (ratio === 0) return 'empty'
  if (ratio <= 0.33) return 'low'
  if (ratio <= 0.66) return 'mid'
  if (ratio < 1) return 'high'
  return 'full'
}
