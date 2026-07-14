import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Metric } from '../db'
import { addDays, todayISO } from '../lib/date'
import { updateMetric } from '../lib/actions'
import DashboardMetricChart from './DashboardMetricChart'

const TIME_RANGES: { label: string; days: number | null }[] = [
  { label: '4w', days: 28 },
  { label: '12w', days: 84 },
  { label: '6mo', days: 182 },
  { label: 'All', days: null },
]

type AreaFilter = 'all' | 'global' | string

/** A metric belongs to an area only via its goal's areaId. Global metrics (goalId null) match "all" or "global". */
function matchesAreaFilter(metric: Metric, goals: Goal[], areaFilter: AreaFilter): boolean {
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
  const allEntries = useLiveQuery(() => db.entries.toArray())

  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')
  const [rangeIndex, setRangeIndex] = useState(1)

  if (!metrics || !goals || !areas || !allEntries) return null

  const visibleMetrics = metrics.filter((m) => m.showOnDashboard && matchesAreaFilter(m, goals, areaFilter))

  const hiddenWithData = metrics.filter(
    (m) => !m.showOnDashboard && matchesAreaFilter(m, goals, areaFilter) && allEntries.some((e) => e.metricId === m.id),
  )

  const range = TIME_RANGES[rangeIndex]
  const cutoff = range.days ? addDays(todayISO(), -range.days) : null

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

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setAreaFilter('all')}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
            areaFilter === 'all' ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setAreaFilter('global')}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
            areaFilter === 'global' ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
          }`}
        >
          General
        </button>
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => setAreaFilter(area.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              areaFilter === area.id ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: area.color }} />
            {area.name}
          </button>
        ))}
      </div>

      {visibleMetrics.length === 0 ? (
        <p className="mt-4 text-sm opacity-60">
          {areaFilter === 'all'
            ? 'No metrics flagged for the dashboard yet.'
            : areaFilter === 'global'
              ? 'No general metrics on the dashboard yet.'
              : 'No dashboard metrics in this area yet.'}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {visibleMetrics.map((metric) => {
            const entries = allEntries
              .filter((e) => e.metricId === metric.id && (!cutoff || e.date >= cutoff))
              .sort((a, b) => a.date.localeCompare(b.date))
            return <DashboardMetricChart key={metric.id} metric={metric} entries={entries} />
          })}
        </div>
      )}

      {hiddenWithData.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium opacity-60">Not shown yet</p>
          <ul className="mt-1.5 space-y-1.5">
            {hiddenWithData.map((metric) => (
              <li
                key={metric.id}
                className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm"
              >
                <span>{metric.name}</span>
                <button
                  type="button"
                  onClick={() => updateMetric(metric.id, { showOnDashboard: true })}
                  className="text-xs font-medium text-accent"
                >
                  Show on dashboard
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
