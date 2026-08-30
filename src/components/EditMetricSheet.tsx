import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Metric } from '../db'
import { deleteMetric, setMetricFields, updateMetric } from '../lib/actions'

const uid = () => crypto.randomUUID()

interface DraftField {
  id: string
  label: string
  unit: string
}

export default function EditMetricSheet({ metric, onClose }: { metric: Metric; onClose: () => void }) {
  const [name, setName] = useState(metric.name)
  const [unit, setUnit] = useState(metric.unit)
  const [direction, setDirection] = useState<Metric['direction']>(metric.direction)
  const [aggregation, setAggregation] = useState<Metric['aggregation']>(metric.aggregation)
  const [target, setTarget] = useState(metric.target !== undefined ? String(metric.target) : '')
  const [showOnDashboard, setShowOnDashboard] = useState(metric.showOnDashboard)
  const [saving, setSaving] = useState(false)

  const [fieldDrafts, setFieldDrafts] = useState<DraftField[]>(() =>
    (metric.fields ?? []).map((f) => ({ id: f.id, label: f.label, unit: f.unit })),
  )
  const [primaryId, setPrimaryId] = useState(metric.primaryFieldId ?? '')

  const hasFields = fieldDrafts.length > 0
  const completeFields = fieldDrafts.filter((d) => d.label.trim() && d.unit.trim())
  const fieldsValid = !hasFields || completeFields.length >= 2

  const canSave = name.trim().length > 0 && (hasFields || unit.trim().length > 0) && fieldsValid

  function setDraft(id: string, patch: Partial<DraftField>) {
    setFieldDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function addField() {
    setFieldDrafts((list) => [...list, { id: uid(), label: '', unit: '' }])
  }

  function removeField(id: string) {
    setFieldDrafts((list) => (list.length <= 2 ? list : list.filter((d) => d.id !== id)))
    setPrimaryId((p) => (p === id ? '' : p))
  }

  function convertToMultiValue() {
    const original: DraftField = { id: uid(), label: name.trim() || metric.name, unit: unit.trim() || metric.unit }
    setFieldDrafts([original, { id: uid(), label: '', unit: '' }])
    setPrimaryId(original.id)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await updateMetric(metric.id, {
      name: name.trim(),
      direction,
      aggregation,
      target: target ? Number(target) : undefined,
      showOnDashboard,
      ...(hasFields ? {} : { unit: unit.trim() }),
    })
    if (hasFields) {
      const clean = completeFields.map((d) => ({ id: d.id, label: d.label.trim(), unit: d.unit.trim() }))
      const primary = clean.find((f) => f.id === primaryId) ?? clean[0]
      await setMetricFields(metric.id, clean, primary.id, metric.comparison ?? 'none')
    }
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

          {!hasFields && (
            <label className="block text-sm">
              Unit
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              />
            </label>
          )}

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

          <div className="border-t border-black/5 pt-3">
            <p className="text-sm font-medium">Fields</p>
            {!hasFields ? (
              <div className="mt-1">
                <p className="text-xs opacity-50">
                  This is a single-value metric. Convert it to track several named values per entry — existing
                  entries stay intact as the primary value.
                </p>
                <button type="button" onClick={convertToMultiValue} className="mt-2 text-sm font-medium text-accent">
                  Convert to multiple values
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {fieldDrafts.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="edit-primary-field"
                      aria-label={`${d.label || 'field'} is primary`}
                      checked={primaryId === d.id}
                      onChange={() => setPrimaryId(d.id)}
                    />
                    <input
                      value={d.label}
                      onChange={(e) => setDraft(d.id, { label: e.target.value })}
                      placeholder="Label"
                      className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                    />
                    <input
                      value={d.unit}
                      onChange={(e) => setDraft(d.id, { unit: e.target.value })}
                      placeholder="Unit"
                      className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeField(d.id)}
                      disabled={fieldDrafts.length <= 2}
                      className="shrink-0 text-xs opacity-50 disabled:opacity-20"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addField} className="text-sm font-medium text-accent">
                  + Add field
                </button>
                <p className="text-xs opacity-50">
                  Entries logged before a field was added show an em dash for it, never 0. The selected radio is the
                  primary value.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
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
