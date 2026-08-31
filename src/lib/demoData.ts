import type { DayLog, LoggedSet, Metric, MetricEntry, Routine, RoutineCheck, WorkoutSession, WorkoutTemplate } from '../db'
import { addDays, startOfIsoWeek, weekdayMon0 } from './date'

export const DEMO_WEEKS = 10

export interface DemoPlan {
  entries: Omit<MetricEntry, 'id'>[]
  routineChecks: Omit<RoutineCheck, 'id'>[]
  dayLogs: DayLog[]
  sessions: Omit<WorkoutSession, 'id' | 'createdAt'>[]
}

export interface DemoConflict {
  table: string
  count: number
}

/** Deterministic PRNG (mulberry32) so the same inputs always produce the same plan. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const round1 = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Per-metric shape of the fake history: starting value, weekly drift, and noise band. */
function metricParams(metric: Metric): { base: number; step: number; jitter: number } {
  const dir = metric.direction === 'decrease' ? -1 : 1
  const table: Record<string, { base: number; step: number; jitter: number }> = {
    'Wall HSPU reps': { base: 3, step: 0.15, jitter: 0.6 },
    'L-sit hold': { base: 12, step: 0.5, jitter: 1.5 },
    'Squat top set': { base: 92, step: 1.4, jitter: 3 },
    'Left/right press gap': { base: 14, step: -0.4, jitter: 1.4 },
    'Left/right row gap': { base: 18, step: -0.6, jitter: 1.6 },
    'Weekly km': { base: 28, step: 1.1, jitter: 4 },
    'Long run': { base: 12, step: 0.5, jitter: 1.6 },
    'Body weight': { base: 79, step: -0.12, jitter: 0.4 },
  }
  return table[metric.name] ?? { base: 10, step: 0.3 * dir, jitter: 1 }
}

/**
 * ~10 weeks of plausible history for the seeded metrics, routines, day logs and
 * one workout template. Pure and deterministic given `today` and the seeded rows,
 * so running it twice yields an identical plan.
 */
export function buildDemoPlan(input: {
  today: string
  metrics: Metric[]
  routines: Routine[]
  template?: WorkoutTemplate
}): DemoPlan {
  const { today, metrics, routines, template } = input
  const firstMonday = startOfIsoWeek(addDays(today, -7 * (DEMO_WEEKS - 1)))
  const weekStarts = Array.from({ length: DEMO_WEEKS }, (_, w) => addDays(firstMonday, w * 7))

  const entries: Omit<MetricEntry, 'id'>[] = []
  const dailyRating = metrics.find((m) => m.goalId === null && m.name === 'Daily rating')

  // Metric entries: roughly twice a week (Tue/Fri), with a gentle trend and occasional skips.
  for (const metric of metrics) {
    if (metric === dailyRating) continue // filled from the day logs below
    const p = metricParams(metric)
    const rand = rng(seedFrom(`entry:${metric.id}`))
    weekStarts.forEach((weekStart, wi) => {
      for (const weekday of [1, 4]) {
        const date = addDays(weekStart, weekday)
        if (date >= today) continue
        if (rand() < 0.12) continue
        const progress = wi + weekday / 7
        const value = clamp(round1(p.base + p.step * progress + (rand() - 0.5) * 2 * p.jitter), 0, 100000)
        entries.push({ metricId: metric.id, date, value })
      }
    })
  }

  // Routine checks: every scheduled day, done most of the time ("never miss twice" is the vibe, not enforced here).
  const routineChecks: Omit<RoutineCheck, 'id'>[] = []
  for (const routine of routines) {
    const rand = rng(seedFrom(`check:${routine.id}`))
    for (let d = 0; d < DEMO_WEEKS * 7; d++) {
      const date = addDays(firstMonday, d)
      if (date >= today) break
      if (!routine.schedule.includes(weekdayMon0(date))) continue
      routineChecks.push({ routineId: routine.id, date, done: rand() > 0.15 })
    }
  }

  // Daily check-ins: most days, rating drifting up a touch.
  const dayLogs: DayLog[] = []
  const ratingRand = rng(seedFrom('daylogs'))
  for (let d = 0; d < DEMO_WEEKS * 7; d++) {
    const date = addDays(firstMonday, d)
    if (date >= today) break
    if (ratingRand() < 0.15) continue
    const rating = clamp(Math.round(6 + d * 0.02 + (ratingRand() - 0.5) * 3.2), 1, 10)
    dayLogs.push({ date, rating })
    if (dailyRating) entries.push({ metricId: dailyRating.id, date, value: rating })
  }

  // Two workout sessions a week from the seeded template.
  const sessions: Omit<WorkoutSession, 'id' | 'createdAt'>[] = []
  if (template && template.exercises.length > 0) {
    const wRand = rng(seedFrom(`sessions:${template.id}`))
    weekStarts.forEach((weekStart, wi) => {
      for (const weekday of [0, 3]) {
        const date = addDays(weekStart, weekday)
        if (date >= today) continue
        const sets: LoggedSet[] = []
        for (const ex of template.exercises) {
          const baseWeight = (ex.targetWeight ?? 40) + wi * 1.5
          const reps = ex.targetReps ?? 8
          const total = Math.max(1, ex.targetSets)
          for (let si = 0; si < total; si++) {
            const sides: (LoggedSet['side'])[] = ex.perSide ? ['left', 'right'] : ['both']
            for (const side of sides) {
              const bump = side === 'right' ? 1 : 0 // a small, consistent right-side edge for the imbalance chart
              sets.push({
                id: `${template.id}:${date}:${ex.id}:${si}:${side}`,
                exerciseId: ex.id,
                exerciseName: ex.name,
                setIndex: si,
                weight: round1(baseWeight + bump + Math.round((wRand() - 0.5) * 4)),
                reps,
                side,
                done: true,
              })
            }
          }
        }
        sessions.push({
          date,
          name: template.name,
          templateId: template.id,
          goalId: template.goalId,
          sets,
          durationMin: 55,
        })
      }
    })
  }

  return { entries, routineChecks, dayLogs, sessions }
}

/**
 * Rows in the plan that the database already contains, grouped by table.
 * A non-empty result means the demo data is already loaded — the loader refuses.
 */
export function demoDataConflicts(
  plan: DemoPlan,
  existing: {
    entries: Pick<MetricEntry, 'metricId' | 'date'>[]
    routineChecks: Pick<RoutineCheck, 'routineId' | 'date'>[]
    dayLogs: Pick<DayLog, 'date'>[]
    sessions: Pick<WorkoutSession, 'templateId' | 'date'>[]
  },
): DemoConflict[] {
  const conflicts: DemoConflict[] = []

  const entryKeys = new Set(existing.entries.map((e) => `${e.metricId}|${e.date}`))
  const entryHits = plan.entries.filter((e) => entryKeys.has(`${e.metricId}|${e.date}`)).length
  if (entryHits > 0) conflicts.push({ table: 'metric entries', count: entryHits })

  const checkKeys = new Set(existing.routineChecks.map((c) => `${c.routineId}|${c.date}`))
  const checkHits = plan.routineChecks.filter((c) => checkKeys.has(`${c.routineId}|${c.date}`)).length
  if (checkHits > 0) conflicts.push({ table: 'routine checks', count: checkHits })

  const logDates = new Set(existing.dayLogs.map((l) => l.date))
  const logHits = plan.dayLogs.filter((l) => logDates.has(l.date)).length
  if (logHits > 0) conflicts.push({ table: 'day logs', count: logHits })

  const sessionKeys = new Set(existing.sessions.map((s) => `${s.templateId ?? ''}|${s.date}`))
  const sessionHits = plan.sessions.filter((s) => sessionKeys.has(`${s.templateId ?? ''}|${s.date}`)).length
  if (sessionHits > 0) conflicts.push({ table: 'workout sessions', count: sessionHits })

  return conflicts
}
