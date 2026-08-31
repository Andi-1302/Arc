import { describe, expect, it } from 'vitest'
import type { Metric, Routine, WorkoutTemplate } from '../db'
import { buildDemoPlan, demoDataConflicts } from './demoData'

const metric = (partial: Partial<Metric>): Metric => ({
  id: partial.name ?? 'm',
  goalId: partial.goalId ?? 'g',
  name: partial.name ?? 'M',
  unit: 'x',
  direction: 'increase',
  aggregation: 'last',
  ...partial,
})

const METRICS: Metric[] = [
  metric({ id: 'weekly-km', name: 'Weekly km', unit: 'km', aggregation: 'sum' }),
  metric({ id: 'body-weight', name: 'Body weight', goalId: null, direction: 'decrease', aggregation: 'avg' }),
  metric({ id: 'daily-rating', name: 'Daily rating', goalId: null, aggregation: 'avg' }),
]

const ROUTINES: Routine[] = [
  { id: 'r-daily', name: 'Posture routine', goalIds: ['g'], schedule: [0, 1, 2, 3, 4, 5, 6], quickMetricIds: [], active: true },
  { id: 'r-tue-thu', name: 'Zone 2 run', goalIds: ['g'], schedule: [1, 3], quickMetricIds: [], active: true },
]

const TEMPLATE: WorkoutTemplate = {
  id: 'tpl-1',
  name: 'Strength A',
  goalId: 'g',
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  exercises: [
    { id: 'ex-squat', name: 'Back squat', targetSets: 3, targetReps: 5, targetWeight: 90, perSide: false, sortOrder: 0 },
    { id: 'ex-press', name: 'DB press', targetSets: 3, targetReps: 8, targetWeight: 18, perSide: true, sortOrder: 1 },
  ],
}

const INPUT = { today: '2026-08-31', metrics: METRICS, routines: ROUTINES, template: TEMPLATE }

describe('buildDemoPlan', () => {
  it('is deterministic — the same inputs produce a byte-identical plan', () => {
    expect(buildDemoPlan(INPUT)).toEqual(buildDemoPlan(INPUT))
  })

  it('produces a decent volume of history across every table', () => {
    const plan = buildDemoPlan(INPUT)
    expect(plan.entries.length).toBeGreaterThan(30)
    expect(plan.routineChecks.length).toBeGreaterThan(50)
    expect(plan.dayLogs.length).toBeGreaterThan(40)
    expect(plan.sessions.length).toBeGreaterThan(12)
    // all dated strictly before "today"
    expect(plan.entries.every((e) => e.date < INPUT.today)).toBe(true)
    // the daily-rating metric is mirrored from the day logs
    expect(plan.entries.some((e) => e.metricId === 'daily-rating')).toBe(true)
  })
})

describe('demoDataConflicts (idempotency guard)', () => {
  it('reports nothing against an empty database', () => {
    const plan = buildDemoPlan(INPUT)
    expect(demoDataConflicts(plan, { entries: [], routineChecks: [], dayLogs: [], sessions: [] })).toEqual([])
  })

  it('reports every planned row when the database already holds the plan (a second run is refused)', () => {
    const plan = buildDemoPlan(INPUT)
    const conflicts = demoDataConflicts(plan, {
      entries: plan.entries,
      routineChecks: plan.routineChecks,
      dayLogs: plan.dayLogs,
      sessions: plan.sessions,
    })
    const total = conflicts.reduce((sum, c) => sum + c.count, 0)
    expect(total).toBe(
      plan.entries.length + plan.routineChecks.length + plan.dayLogs.length + plan.sessions.length,
    )
    expect(conflicts.map((c) => c.table).sort()).toEqual(
      ['day logs', 'metric entries', 'routine checks', 'workout sessions'].sort(),
    )
  })

  it('detects a partial overlap (one existing metric entry is enough to refuse)', () => {
    const plan = buildDemoPlan(INPUT)
    const conflicts = demoDataConflicts(plan, {
      entries: [plan.entries[0]],
      routineChecks: [],
      dayLogs: [],
      sessions: [],
    })
    expect(conflicts).toEqual([{ table: 'metric entries', count: 1 }])
  })
})
