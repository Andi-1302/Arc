import type { Metric, MetricEntry } from '../db'
import { startOfIsoWeek } from './date'

export interface WeeklyPoint {
  week: string
  value: number
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
