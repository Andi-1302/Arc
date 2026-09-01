import type { Metric, MetricEntry, MetricField } from '../db'
import { daysBetween, startOfIsoWeek } from './date'

/**
 * Effective dashboard mode. `showOnDashboard` is the legacy boolean kept for
 * backwards compatibility — read the mode as: dashboardMode ?? (showOnDashboard ? 'always' : 'auto').
 */
export function metricDashboardMode(
  metric: Pick<Metric, 'dashboardMode' | 'showOnDashboard'>,
): 'auto' | 'always' | 'never' {
  return metric.dashboardMode ?? (metric.showOnDashboard ? 'always' : 'auto')
}

/**
 * Whether a metric shows on the Stats dashboard by default:
 * - 'always' → yes, regardless of the goal
 * - 'never'  → no
 * - 'auto'   → only when the metric is global (no goal) or its goal is the current
 *              block's focus / secondary goal
 */
export function isMetricOnDashboard(
  metric: Pick<Metric, 'goalId' | 'dashboardMode' | 'showOnDashboard'>,
  prioritizedGoalIds: string[],
): boolean {
  const mode = metricDashboardMode(metric)
  if (mode === 'always') return true
  if (mode === 'never') return false
  return metric.goalId === null || prioritizedGoalIds.includes(metric.goalId)
}

export const DORMANT_WEEKS = 12

/**
 * Dormancy applies only to the long tail. A metric that resolves to 'always', or
 * that sits on the current block's focus / secondary goal, is never dormant — a
 * rarely-measured benchmark on a live goal is deliberate, not stale. Otherwise it
 * is dormant when its last entry is older than {@link DORMANT_WEEKS} weeks (a block
 * length), or it has none.
 */
export function isDormant(
  metric: Pick<Metric, 'goalId' | 'dashboardMode' | 'showOnDashboard'>,
  lastActivity: string | null | undefined,
  prioritizedGoalIds: string[],
  today: string,
  weeks = DORMANT_WEEKS,
): boolean {
  if (metricDashboardMode(metric) === 'always') return false
  if (metric.goalId !== null && prioritizedGoalIds.includes(metric.goalId)) return false
  if (!lastActivity) return true
  return daysBetween(lastActivity, today) > weeks * 7
}

export interface DashboardBuckets {
  /** shown by default, most prominent first (pinned, then most recently measured) */
  active: Metric[]
  /** shown, but folded away — resolves to 'auto', not on a live goal, nothing logged in ~12 weeks */
  dormant: Metric[]
  /** not shown by default — 'never', or 'auto' on a resting goal — regardless of whether it has entries */
  overflow: Metric[]
}

/**
 * Splits the (already area-filtered) metrics into the three Stats-dashboard groups.
 * `lastEntryDate` returns a metric's most recent entry date, or null when it has none.
 */
export function bucketDashboardMetrics(
  metrics: Metric[],
  prioritizedGoalIds: string[],
  lastEntryDate: (metricId: string) => string | null,
  today: string,
): DashboardBuckets {
  const byRecency = (a: Metric, b: Metric) =>
    (lastEntryDate(b.id) ?? '').localeCompare(lastEntryDate(a.id) ?? '')
  const pinnedFirst = (a: Metric, b: Metric) => {
    const rank = (m: Metric) => (metricDashboardMode(m) === 'always' ? 0 : 1)
    return rank(a) - rank(b) || byRecency(a, b)
  }
  const dorm = (m: Metric) => isDormant(m, lastEntryDate(m.id), prioritizedGoalIds, today)

  const shown = metrics.filter((m) => isMetricOnDashboard(m, prioritizedGoalIds))
  return {
    active: shown.filter((m) => !dorm(m)).sort(pinnedFirst),
    dormant: shown.filter(dorm).sort(byRecency),
    overflow: metrics.filter((m) => !isMetricOnDashboard(m, prioritizedGoalIds)).sort(byRecency),
  }
}

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
 * Imbalance between two sides as a percentage of the larger side:
 * |a − b| / max(|a|, |b|) × 100. The single source of this formula — reused by
 * left/right metrics and by per-side workout exercises.
 */
export function imbalancePercent(a: number, b: number): number {
  const larger = Math.max(Math.abs(a), Math.abs(b))
  return larger === 0 ? 0 : (Math.abs(a - b) / larger) * 100
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
    series.push({ date: entry.date, gap: imbalancePercent(left, right) })
  }
  return series
}
