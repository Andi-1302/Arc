import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Metric } from '../db'
import { addDays, todayISO } from '../lib/date'
import { getCurrentBlock, getPrioritizedGoalIds } from '../lib/prioritized'
import { bucketDashboardMetrics, metricDashboardMode } from '../lib/metrics'
import { updateMetric } from '../lib/actions'
import DashboardMetricChart from './DashboardMetricChart'
import AreaFilterChips, { type AreaFilterValue } from './AreaFilterChips'
import ChartModeMenu, { type ChartMode } from './ChartModeMenu'

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

function CompactMetricRow({
  metric,
  mode,
  onModeChange,
}: {
  metric: Metric
  mode: ChartMode
  onModeChange: (mode: ChartMode) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-black/5 bg-surface px-3 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{metric.name}</p>
        <p className="text-xs opacity-50">No entries yet</p>
      </div>
      <ChartModeMenu label={metric.name} mode={mode} onChange={onModeChange} />
    </div>
  )
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
  const lastEntryDate = (id: string) => lastEntry.get(id) ?? null

  const inArea = metrics.filter((m) => matchesAreaFilter(m, goals, areaFilter))
  const { active, dormant, overflow } = bucketDashboardMetrics(inArea, prioritized, lastEntryDate, today)

  const setMode = (metric: Metric) => (mode: ChartMode) => updateMetric(metric.id, { dashboardMode: mode })

  const renderMetric = (metric: Metric) => {
    const mode = metricDashboardMode(metric)
    // A metric with no entries at all has no chart to hang a control off — render a compact row instead.
    if (!lastEntry.has(metric.id)) {
      return <CompactMetricRow key={metric.id} metric={metric} mode={mode} onModeChange={setMode(metric)} />
    }
    const entries = allEntries
      .filter((e) => e.metricId === metric.id && (!cutoff || e.date >= cutoff))
      .sort((a, b) => a.date.localeCompare(b.date))
    return (
      <DashboardMetricChart
        key={metric.id}
        metric={metric}
        entries={entries}
        mode={mode}
        onModeChange={setMode(metric)}
      />
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
        <div data-testid="dashboard-active" className="mt-3 space-y-3">
          {active.map(renderMetric)}
        </div>
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
          {showDormant && <div className="mt-2 space-y-3">{dormant.map(renderMetric)}</div>}
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
          {showAll && <div className="mt-2 space-y-3">{overflow.map(renderMetric)}</div>}
        </div>
      )}
    </div>
  )
}
