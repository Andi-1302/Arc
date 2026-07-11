import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db'
import { addMetricEntry } from '../lib/actions'

export default function QuickEntrySheet({
  routine,
  date,
  onClose,
}: {
  routine: Routine
  date: string
  onClose: () => void
}) {
  const metrics = useLiveQuery(() => db.metrics.bulkGet(routine.quickMetricIds), [routine.quickMetricIds])
  const [values, setValues] = useState<Record<string, string>>({})

  async function handleSave() {
    if (metrics) {
      for (const metric of metrics) {
        if (!metric) continue
        const raw = values[metric.id]
        if (raw === undefined || raw === '') continue
        const value = Number(raw)
        if (Number.isNaN(value)) continue
        await addMetricEntry(metric.id, date, value)
      }
    }
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{routine.name}</h3>
        <div className="mt-3 space-y-3">
          {metrics?.map((metric) =>
            metric ? (
              <label key={metric.id} className="block text-sm">
                {metric.name} <span className="opacity-60">({metric.unit})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={values[metric.id] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [metric.id]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
                />
              </label>
            ) : null,
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
