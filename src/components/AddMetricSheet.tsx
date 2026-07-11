import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Metric } from '../db'
import { METRIC_TEMPLATES } from '../lib/metricTemplates'
import { createMetric } from '../lib/actions'

export default function AddMetricSheet({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [direction, setDirection] = useState<Metric['direction']>('increase')
  const [aggregation, setAggregation] = useState<Metric['aggregation']>('max')
  const [showOnDashboard, setShowOnDashboard] = useState(false)
  const [target, setTarget] = useState('')

  function pickTemplate(key: string) {
    const t = METRIC_TEMPLATES.find((tpl) => tpl.key === key)
    if (!t) return
    setTemplateKey(key)
    setName(t.key === 'custom' ? '' : t.label)
    setUnit(t.unit)
    setDirection(t.direction)
    setAggregation(t.aggregation)
  }

  async function handleSave() {
    if (!name.trim() || !unit.trim()) return
    await createMetric({
      goalId,
      name: name.trim(),
      unit: unit.trim(),
      direction,
      aggregation,
      showOnDashboard,
      target: target ? Number(target) : undefined,
    })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-semibold">Add metric</h3>

        {!templateKey ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {METRIC_TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTemplate(t.key)}
                className="rounded-lg border border-black/10 px-3 py-2 text-left text-sm"
              >
                {t.label}
                {t.key !== 'custom' && (
                  <span className="block text-xs opacity-50">
                    {t.unit} · {t.aggregation}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
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
              <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)} />
              Show on Stats dashboard
            </label>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          {templateKey && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !unit.trim()}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
