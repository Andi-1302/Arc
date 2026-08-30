import { describe, expect, it } from 'vitest'
import type { MetricEntry, MetricField } from '../db'
import { aggregateWeeklyByField, imbalanceSeries } from './metrics'
import { startOfIsoWeek } from './date'

const LEFT: MetricField = { id: 'f-left', label: 'Left', unit: 'kg' }
const RIGHT: MetricField = { id: 'f-right', label: 'Right', unit: 'kg' }

function entry(date: string, values: Record<string, number> | undefined, value = 0): MetricEntry {
  return { id: `e-${date}-${JSON.stringify(values)}`, metricId: 'm1', date, value, values }
}

// 2026-08-10 and 2026-08-13 share an ISO week; 2026-08-18 is the next one.
const WEEK_A = startOfIsoWeek('2026-08-10')
const WEEK_B = startOfIsoWeek('2026-08-18')

describe('aggregateWeeklyByField', () => {
  const entries: MetricEntry[] = [
    entry('2026-08-10', { 'f-left': 10, 'f-right': 8 }),
    entry('2026-08-13', { 'f-left': 20, 'f-right': 12 }),
    // 'f-right' was added later — this entry predates it and carries no value for it.
    entry('2026-08-18', { 'f-left': 30 }),
    // a fully-legacy entry (no values map at all) must be ignored, not read as 0.
    entry('2026-08-19', undefined, 99),
  ]

  it('returns one series per field, aggregated per the metric setting', () => {
    const result = aggregateWeeklyByField(entries, [LEFT, RIGHT], 'max')
    expect(result.map((r) => r.fieldId)).toEqual(['f-left', 'f-right'])

    const left = result[0]
    expect(left.label).toBe('Left')
    expect(left.points).toEqual([
      { week: WEEK_A, value: 20 },
      { week: WEEK_B, value: 30 },
    ])
  })

  it('omits weeks where a field has no entry — never emits a 0 for a predating field', () => {
    const right = aggregateWeeklyByField(entries, [LEFT, RIGHT], 'max')[1]
    expect(right.points).toEqual([{ week: WEEK_A, value: 12 }])
    expect(right.points.some((p) => p.week === WEEK_B)).toBe(false)
  })

  it('respects avg and sum aggregation', () => {
    const [leftAvg] = aggregateWeeklyByField(entries, [LEFT], 'avg')
    expect(leftAvg.points[0]).toEqual({ week: WEEK_A, value: 15 })

    const [leftSum] = aggregateWeeklyByField(entries, [LEFT], 'sum')
    expect(leftSum.points).toEqual([
      { week: WEEK_A, value: 30 },
      { week: WEEK_B, value: 30 },
    ])
  })
})

describe('imbalanceSeries', () => {
  it('computes the gap as |L−R| / larger side × 100', () => {
    const series = imbalanceSeries(
      [
        entry('2026-08-10', { 'f-left': 10, 'f-right': 8 }),
        entry('2026-08-13', { 'f-left': 20, 'f-right': 10 }),
      ],
      'f-left',
      'f-right',
    )
    expect(series).toEqual([
      { date: '2026-08-10', gap: 20 },
      { date: '2026-08-13', gap: 50 },
    ])
  })

  it('skips entries that predate one of the sides', () => {
    const series = imbalanceSeries(
      [
        entry('2026-08-10', { 'f-left': 30 }),
        entry('2026-08-13', { 'f-left': 20, 'f-right': 10 }),
        entry('2026-08-14', { 'f-right': 5 }),
      ],
      'f-left',
      'f-right',
    )
    expect(series).toEqual([{ date: '2026-08-13', gap: 50 }])
  })

  it('reports a 0 gap when both sides are 0', () => {
    const series = imbalanceSeries([entry('2026-08-10', { 'f-left': 0, 'f-right': 0 })], 'f-left', 'f-right')
    expect(series).toEqual([{ date: '2026-08-10', gap: 0 }])
  })
})
