import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import MetricBlock from './MetricBlock'
import AddMetricSheet from './AddMetricSheet'

/**
 * Global metrics (goalId null — body weight, daily rating, …) can appear on the
 * dashboard but have no goal screen to log entries from. This is that screen:
 * the same MetricBlock quick-add + entry list used on a goal.
 */
export default function GeneralMetricsSection() {
  const metrics = useLiveQuery(() => db.metrics.filter((m) => m.goalId === null).toArray())
  const [adding, setAdding] = useState(false)

  if (!metrics) return null

  const sorted = [...metrics].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="flex items-center justify-end">
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-accent">
          + New general metric
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">No general metrics yet.</p>
      ) : (
        <div className="mt-3 space-y-6">
          {sorted.map((metric) => (
            <MetricBlock key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {adding && <AddMetricSheet goalId={null} onClose={() => setAdding(false)} />}
    </div>
  )
}
