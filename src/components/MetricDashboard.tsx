import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addDays, todayISO } from '../lib/date'
import DashboardMetricChart from './DashboardMetricChart'

const TIME_RANGES: { label: string; days: number | null }[] = [
  { label: '4w', days: 28 },
  { label: '12w', days: 84 },
  { label: '6mo', days: 182 },
  { label: 'All', days: null },
]

export default function MetricDashboard() {
  const metrics = useLiveQuery(() => db.metrics.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
  const allEntries = useLiveQuery(() => db.entries.toArray())

  const [areaFilter, setAreaFilter] = useState<string | 'all'>('all')
  const [rangeIndex, setRangeIndex] = useState(1)

  if (!metrics || !goals || !areas || !allEntries) return null

  const dashboardMetrics = metrics.filter((m) => m.showOnDashboard)
  const visibleMetrics =
    areaFilter === 'all'
      ? dashboardMetrics
      : dashboardMetrics.filter((m) => {
          if (!m.goalId) return true // global metrics always show, regardless of area filter
          const goal = goals.find((g) => g.id === m.goalId)
          return goal?.areaId === areaFilter
        })

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
          No metrics flagged for the dashboard yet — enable "Show on Stats dashboard" when adding a metric.
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
    </div>
  )
}
