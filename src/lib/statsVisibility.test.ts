import { describe, expect, it } from 'vitest'
import type { Metric } from '../db'
import { isDormant, isMetricOnDashboard, metricDashboardMode } from './metrics'

function metric(partial: Partial<Metric>): Metric {
  return {
    id: 'm',
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

describe('isDormant (8-week cutoff)', () => {
  const today = '2026-08-31'

  it('is active when the last entry is within 8 weeks', () => {
    expect(isDormant('2026-08-01', today)).toBe(false)
  })

  it('is dormant when the last entry is older than 8 weeks', () => {
    expect(isDormant('2026-06-01', today)).toBe(true)
  })

  it('is dormant with no entry at all', () => {
    expect(isDormant(null, today)).toBe(true)
  })

  it('treats exactly 56 days as still active', () => {
    expect(isDormant('2026-07-06', today)).toBe(false)
  })
})
