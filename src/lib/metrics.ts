import type { Metric, MetricEntry, MetricField } from '../db'
import { startOfIsoWeek } from './date'

export interface WeeklyPoint {
  week: string
  value: number
}

export interface FieldWeekly {
  fieldId: string
  label: string
  points: WeeklyPoint[]
}

export interface ImbalancePoint {
  date: string
  /** |left − right| / max(|left|, |right|) × 100, in percent. */
  gap: number
}

/**
 * Compatibility rule (db.ts): the number stored in `MetricEntry.value` for a
 * multi-field metric is a mirror of the primary field. Given a per-field map and
 * the primary field id, this returns that mirror value.
 */
export function primaryValue(values: Record<string, number>, primaryFieldId: string | undefined): number {
  if (primaryFieldId !== undefined && values[primaryFieldId] !== undefined) return values[primaryFieldId]
  const nums = Object.values(values)
  return nums.length > 0 ? nums[0] : 0
}

/** Weekly chart aggregation per the metric's own setting (spec §5/§8.2). Entries must be sorted by date ascending. */
export function aggregateWeekly(entries: MetricEntry[], aggregation: Metric['aggregation']): WeeklyPoint[] {
  const byWeek = new Map<string, number[]>()
  for (const entry of entries) {
    const week = startOfIsoWeek(entry.date)
    const values = byWeek.get(week)
    if (values) values.push(entry.value)
    else byWeek.set(week, [entry.value])
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, values]) => {
      let value: number
      switch (aggregation) {
        case 'sum':
          value = values.reduce((a, b) => a + b, 0)
          break
        case 'max':
          value = Math.max(...values)
          break
        case 'last':
          value = values[values.length - 1]
          break
        case 'avg':
          value = values.reduce((a, b) => a + b, 0) / values.length
          break
      }
      return { week, value }
    })
}

/**
 * Weekly aggregation for a multi-field metric: one {@link WeeklyPoint} array per
 * field, each aggregated with the metric's own setting. Entries with no value for
 * a field (they predate it) contribute nothing to that field — never a 0.
 * Entries must be sorted by date ascending.
 */
export function aggregateWeeklyByField(
  entries: MetricEntry[],
  fields: MetricField[],
  aggregation: Metric['aggregation'],
): FieldWeekly[] {
  return fields.map((field) => {
    const fieldEntries = entries
      .filter((e) => e.values?.[field.id] !== undefined)
      .map((e) => ({ ...e, value: e.values![field.id] }))
    return { fieldId: field.id, label: field.label, points: aggregateWeekly(fieldEntries, aggregation) }
  })
}

/**
 * Derived imbalance series for a left/right metric: per entry that has both sides,
 * the absolute difference as a percentage of the larger side. Entries missing
 * either side (they predate one of the fields) are skipped.
 */
export function imbalanceSeries(
  entries: MetricEntry[],
  leftFieldId: string,
  rightFieldId: string,
): ImbalancePoint[] {
  const series: ImbalancePoint[] = []
  for (const entry of entries) {
    const left = entry.values?.[leftFieldId]
    const right = entry.values?.[rightFieldId]
    if (left === undefined || right === undefined) continue
    const larger = Math.max(Math.abs(left), Math.abs(right))
    const gap = larger === 0 ? 0 : (Math.abs(left - right) / larger) * 100
    series.push({ date: entry.date, gap })
  }
  return series
}
