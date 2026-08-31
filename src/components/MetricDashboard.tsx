import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Metric } from '../db'
import { addDays, todayISO } from '../lib/date'
import { getCurrentBlock, getPrioritizedGoalIds } from '../lib/prioritized'
import { isDormant, isMetricOnDashboard, metricDashboardMode } from '../lib/metrics'
import { updateMetric } from '../lib/actions'
import DashboardMetricChart from './DashboardMetricChart'
import AreaFilterChips, { type AreaFilterValue } from './AreaFilterChips'
import ChartModeMenu from './ChartModeMenu'

const TIME_RANGES: { label: string; days: number | null }[] = [
  { label: '4w', days: 28 },
  { label: '12w', days: 84 },
  { label: '6mo', days: 182 },
  { label: 'All', days: null },
]

/** A metric belongs to an area only via its goal's areaId. Global metrics (goalId null) match "all" or "global". */
function matchesAreaFilter(metric: Metric, goals: Goal[], areaFilter: AreaFilterValue): boolean {
  if (areaFilter === 'all') return true
  if (areaFilter === 'global') return !metric.goalId
  if (!metric.goalId) return false
  const goal = goals.find((g) => g.id === metric.goalId)
  return goal?.areaId === areaFilter
}

export default function MetricDashboard() {
  const metrics = useLiveQuery(() => db.metrics.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
  const blocks = useLiveQuery(() => db.blocks.toArray())
  const allEntries = useLiveQuery(() => db.entries.toArray())

  const [areaFilter, setAreaFilter] = useState<AreaFilterValue>('all')
  const [rangeIndex, setRangeIndex] = useState(1)
  const [showAll, setShowAll] = useState(false)
  const [showDormant, setShowDormant] = useState(false)

  if (!metrics || !goals || !areas || !blocks || !allEntries) return null

  const prioritized = getPrioritizedGoalIds(getCurrentBlock(blocks))
  const today = todayISO()
  const range = TIME_RANGES[rangeIndex]
  const cutoff = range.days ? addDays(today, -range.days) : null

  const lastEntry = new Map<string, string>()
  for (const e of allEntries) {
    const cur = lastEntry.get(e.metricId)
    if (!cur || e.date > cur) lastEntry.set(e.metricId, e.date)
  }
  const lastOf = (m: Metric) => lastEntry.get(m.id) ?? null
  const byRecency = (a: Metric, b: Metric) => (lastOf(b) ?? '').localeCompare(lastOf(a) ?? '')

  const inArea = metrics.filter((m) => matchesAreaFilter(m, goals, areaFilter))
  const shown = inArea.filter((m) => isMetricOnDashboard(m, prioritized)).sort(byRecency)
  const active = shown.filter((m) => !isDormant(lastOf(m), today))
  const dormant = shown.filter((m) => isDormant(lastOf(m), today))
  // "Show all" = everything else with data: mode 'never', or 'auto' on a resting goal.
  const overflow = inArea
    .filter((m) => !isMetricOnDashboard(m, prioritized) && lastEntry.has(m.id))
    .sort(byRecency)

  const chart = (metric: Metric) => {
    const entries = allEntries
      .filter((e) => e.metricId === metric.id && (!cutoff || e.date >= cutoff))
      .sort((a, b) => a.date.localeCompare(b.date))
    return (
      <div key={metric.id} className="relative">
        <DashboardMetricChart metric={metric} entries={entries} />
        <ChartModeMenu
          label={metric.name}
          mode={metricDashboardMode(metric)}
          onChange={(mode) => updateMetric(metric.id, { dashboardMode: mode })}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-1.5">
        {TIME_RANGES.map((r, i) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRangeIndex(i)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              i === rangeIndex ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <AreaFilterChips areas={areas} value={areaFilter} onChange={setAreaFilter} />
      </div>

      {active.length === 0 && dormant.length === 0 && overflow.length === 0 ? (
        <p className="mt-4 text-sm opacity-60">Nothing to show for this filter yet.</p>
      ) : (
        <div className="mt-3 space-y-3">{active.map(chart)}</div>
      )}

      {dormant.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowDormant((s) => !s)}
            className="text-xs font-medium opacity-60"
          >
            {showDormant ? 'Hide' : 'Show'} dormant ({dormant.length})
          </button>
          {showDormant && <div className="mt-2 space-y-3">{dormant.map(chart)}</div>}
        </div>
      )}

      {overflow.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="text-sm font-medium text-accent"
          >
            {showAll ? 'Hide' : 'Show all'} ({overflow.length})
          </button>
          {showAll && <div className="mt-2 space-y-3">{overflow.map(chart)}</div>}
        </div>
      )}
    </div>
  )
}
