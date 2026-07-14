import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Metric } from '../db'
import { deleteMetric, updateMetric } from '../lib/actions'

export default function EditMetricSheet({ metric, onClose }: { metric: Metric; onClose: () => void }) {
  const [name, setName] = useState(metric.name)
  const [unit, setUnit] = useState(metric.unit)
  const [direction, setDirection] = useState<Metric['direction']>(metric.direction)
  const [aggregation, setAggregation] = useState<Metric['aggregation']>(metric.aggregation)
  const [target, setTarget] = useState(metric.target !== undefined ? String(metric.target) : '')
  const [showOnDashboard, setShowOnDashboard] = useState(metric.showOnDashboard)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !unit.trim()) return
    setSaving(true)
    await updateMetric(metric.id, {
      name: name.trim(),
      unit: unit.trim(),
      direction,
      aggregation,
      target: target ? Number(target) : undefined,
      showOnDashboard,
    })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${metric.name}"? This removes all its logged entries too.`)) return
    await deleteMetric(metric.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Edit metric</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Unit
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-sm">
              Direction
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as Metric['direction'])}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              >
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
              </select>
            </label>
            <label className="flex-1 text-sm">
              Weekly aggregation
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as Metric['aggregation'])}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              >
                <option value="sum">Sum</option>
                <option value="max">Max</option>
                <option value="last">Last</option>
                <option value="avg">Average</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Block target (optional)
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnDashboard}
              onChange={(e) => setShowOnDashboard(e.target.checked)}
            />
            Show on Stats dashboard
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !unit.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <div className="mt-4 border-t border-black/5 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
          >
            Delete metric
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
