import { describe, expect, it } from 'vitest'
import type { Metric } from '../db'
import { bucketDashboardMetrics, isDormant, isMetricOnDashboard, metricDashboardMode } from './metrics'

function metric(partial: Partial<Metric>): Metric {
  return {
    id: partial.id ?? 'm',
    goalId: null,
    name: 'M',
    unit: 'x',
    direction: 'increase',
    aggregation: 'last',
    showOnDashboard: false,
    ...partial,
  }
}

const PRIORITIZED = ['focus-goal', 'secondary-goal']
const TODAY = '2026-08-31'

describe('metricDashboardMode', () => {
  it('defaults to auto and maps legacy showOnDashboard', () => {
    expect(metricDashboardMode(metric({}))).toBe('auto')
    expect(metricDashboardMode(metric({ showOnDashboard: true }))).toBe('always')
    expect(metricDashboardMode(metric({ dashboardMode: 'never', showOnDashboard: true }))).toBe('never')
  })
})

describe('isMetricOnDashboard', () => {
  it("'always' is shown regardless of the goal's priority", () => {
    expect(isMetricOnDashboard(metric({ dashboardMode: 'always', goalId: 'other-goal' }), PRIORITIZED)).toBe(true)
  })

  it("'never' is hidden even on the focus goal", () => {
    expect(isMetricOnDashboard(metric({ dashboardMode: 'never', goalId: 'focus-goal' }), PRIORITIZED)).toBe(false)
  })

  it("'auto' on a prioritised goal is shown", () => {
    expect(isMetricOnDashboard(metric({ dashboardMode: 'auto', goalId: 'secondary-goal' }), PRIORITIZED)).toBe(true)
  })

  it("'auto' on a non-prioritised goal is hidden", () => {
    expect(isMetricOnDashboard(metric({ dashboardMode: 'auto', goalId: 'other-goal' }), PRIORITIZED)).toBe(false)
  })

  it("'auto' global metric (no goal) is shown", () => {
    expect(isMetricOnDashboard(metric({ dashboardMode: 'auto', goalId: null }), PRIORITIZED)).toBe(true)
  })

  it('legacy showOnDashboard:false on a non-prioritised goal is hidden', () => {
    expect(isMetricOnDashboard(metric({ goalId: 'other-goal' }), PRIORITIZED)).toBe(false)
  })
})

describe('isDormant (12-week cutoff, long-tail only)', () => {
  const auto = (over: Partial<Metric> = {}) => metric({ dashboardMode: 'auto', goalId: 'other-goal', ...over })

  it('is active when the last entry is within 12 weeks', () => {
    expect(isDormant(auto(), '2026-07-01', PRIORITIZED, TODAY)).toBe(false)
  })

  it('is dormant when the last entry is older than 12 weeks', () => {
    expect(isDormant(auto(), '2026-05-01', PRIORITIZED, TODAY)).toBe(true)
  })

  it('treats exactly 84 days as still active', () => {
    expect(isDormant(auto(), '2026-06-08', PRIORITIZED, TODAY)).toBe(false)
  })

  it('is dormant with no entry at all (long tail)', () => {
    expect(isDormant(auto(), null, PRIORITIZED, TODAY)).toBe(true)
  })

  it('a prioritised-goal metric is never dormant, even with no recent entry', () => {
    expect(isDormant(auto({ goalId: 'focus-goal' }), '2026-01-01', PRIORITIZED, TODAY)).toBe(false)
    expect(isDormant(auto({ goalId: 'secondary-goal' }), null, PRIORITIZED, TODAY)).toBe(false)
  })

  it("a metric that resolves to 'always' is never dormant", () => {
    expect(isDormant(metric({ dashboardMode: 'always', goalId: 'other-goal' }), null, PRIORITIZED, TODAY)).toBe(false)
    expect(isDormant(metric({ showOnDashboard: true, goalId: 'other-goal' }), '2026-01-01', PRIORITIZED, TODAY)).toBe(false)
  })
})

describe('bucketDashboardMetrics', () => {
  const noEntries = () => null

  it('puts a metric with no entries at all into the overflow list', () => {
    const m = metric({ id: 'rare-1rm', goalId: 'other-goal', name: 'Rare bench 1RM' })
    const { active, dormant, overflow } = bucketDashboardMetrics([m], PRIORITIZED, noEntries, TODAY)
    expect(overflow.map((x) => x.id)).toEqual(['rare-1rm'])
    expect(active).toEqual([])
    expect(dormant).toEqual([])
  })

  it('keeps a prioritised metric with no recent entry active, not dormant', () => {
    const m = metric({ id: 'bench-1rm', goalId: 'focus-goal', dashboardMode: 'auto' })
    const { active, dormant } = bucketDashboardMetrics([m], PRIORITIZED, () => '2026-01-01', TODAY)
    expect(active.map((x) => x.id)).toEqual(['bench-1rm'])
    expect(dormant).toEqual([])
  })

  it('orders active metrics pinned-first, then by most recent entry', () => {
    const pinned = metric({ id: 'pinned', dashboardMode: 'always', goalId: null })
    const recent = metric({ id: 'recent', dashboardMode: 'auto', goalId: null })
    const older = metric({ id: 'older', dashboardMode: 'auto', goalId: null })
    const last: Record<string, string> = { pinned: '2026-01-01', recent: '2026-08-20', older: '2026-07-01' }
    const { active } = bucketDashboardMetrics(
      [older, recent, pinned],
      PRIORITIZED,
      (id) => last[id] ?? null,
      TODAY,
    )
    expect(active.map((x) => x.id)).toEqual(['pinned', 'recent', 'older'])
  })

  it("routes a 'never' metric with entries into overflow", () => {
    const m = metric({ id: 'hidden', dashboardMode: 'never', goalId: 'focus-goal' })
    const { active, overflow } = bucketDashboardMetrics([m], PRIORITIZED, () => '2026-08-30', TODAY)
    expect(active).toEqual([])
    expect(overflow.map((x) => x.id)).toEqual(['hidden'])
  })
})
