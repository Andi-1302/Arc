import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import MetricBlock from './MetricBlock'
import AddMetricSheet from './AddMetricSheet'

export default function MetricsSection({ goalId }: { goalId: string }) {
  const metrics = useLiveQuery(() => db.metrics.where('goalId').equals(goalId).toArray(), [goalId])
  const [adding, setAdding] = useState(false)

  if (!metrics) return null

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Metrics</h2>
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-accent">
          + Add metric
        </button>
      </div>

      {metrics.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">No metrics yet.</p>
      ) : (
        <div className="mt-3 space-y-6">
          {metrics.map((metric) => (
            <MetricBlock key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {adding && <AddMetricSheet goalId={goalId} onClose={() => setAdding(false)} />}
    </div>
  )
}
