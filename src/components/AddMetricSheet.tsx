import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Metric, MetricField } from '../db'
import { METRIC_TEMPLATES } from '../lib/metricTemplates'
import { createMetric } from '../lib/actions'

type Kind = 'single' | 'leftRight' | 'multi'

const KINDS: { key: Kind; label: string; hint: string }[] = [
  { key: 'single', label: 'Single value', hint: 'One number per entry — the default' },
  { key: 'leftRight', label: 'Left / right', hint: 'Two sides sharing a unit, with an imbalance %' },
  { key: 'multi', label: 'Multiple values', hint: 'Name each value and give it its own unit' },
]

const uid = () => crypto.randomUUID()

export default function AddMetricSheet({ goalId, onClose }: { goalId: string; onClose: () => void }) {
  const [kind, setKind] = useState<Kind | null>(null)

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Add metric</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        {kind === null && (
          <div className="mt-3 space-y-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className="block w-full rounded-lg border border-black/10 px-3 py-2.5 text-left text-sm"
              >
                <span className="font-medium">{k.label}</span>
                <span className="block text-xs opacity-50">{k.hint}</span>
              </button>
            ))}
          </div>
        )}

        {kind === 'single' && <SingleForm goalId={goalId} onBack={() => setKind(null)} onClose={onClose} />}
        {kind === 'leftRight' && <LeftRightForm goalId={goalId} onBack={() => setKind(null)} onClose={onClose} />}
        {kind === 'multi' && <MultiForm goalId={goalId} onBack={() => setKind(null)} onClose={onClose} />}
      </div>
    </div>,
    document.body,
  )
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="mt-3 text-sm font-medium text-accent">
      ‹ Metric type
    </button>
  )
}

function DirectionAndAggregation({
  direction,
  setDirection,
  aggregation,
  setAggregation,
}: {
  direction: Metric['direction']
  setDirection: (v: Metric['direction']) => void
  aggregation: Metric['aggregation']
  setAggregation: (v: Metric['aggregation']) => void
}) {
  return (
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
  )
}

function SaveRow({ onClose, onSave, disabled }: { onClose: () => void; onSave: () => void; disabled: boolean }) {
  return (
    <div className="mt-4 flex gap-2">
      <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Save
      </button>
    </div>
  )
}

/* -------------------- Single value (unchanged behaviour) -------------------- */

function SingleForm({ goalId, onBack, onClose }: { goalId: string; onBack: () => void; onClose: () => void }) {
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

  if (!templateKey) {
    return (
      <>
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
        <BackRow onBack={onBack} />
      </>
    )
  }

  return (
    <>
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
        <DirectionAndAggregation
          direction={direction}
          setDirection={setDirection}
          aggregation={aggregation}
          setAggregation={setAggregation}
        />
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
      <SaveRow onClose={onClose} onSave={handleSave} disabled={!name.trim() || !unit.trim()} />
    </>
  )
}

/* -------------------- Left / right -------------------- */

function LeftRightForm({ goalId, onBack, onClose }: { goalId: string; onBack: () => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [direction, setDirection] = useState<Metric['direction']>('decrease')
  const [aggregation, setAggregation] = useState<Metric['aggregation']>('last')
  const [showOnDashboard, setShowOnDashboard] = useState(false)

  async function handleSave() {
    if (!name.trim() || !unit.trim()) return
    const u = unit.trim()
    const left: MetricField = { id: uid(), label: 'Left', unit: u }
    const right: MetricField = { id: uid(), label: 'Right', unit: u }
    await createMetric({
      goalId,
      name: name.trim(),
      unit: u,
      direction,
      aggregation,
      showOnDashboard,
      fields: [left, right],
      primaryFieldId: left.id,
      comparison: 'leftRight',
    })
    onClose()
  }

  return (
    <>
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
          Unit (shared by both sides)
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg, %, s…"
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <DirectionAndAggregation
          direction={direction}
          setDirection={setDirection}
          aggregation={aggregation}
          setAggregation={setAggregation}
        />
        <p className="text-xs opacity-50">
          Creates two fields, <span className="font-medium">Left</span> and <span className="font-medium">Right</span>.
          Left is the primary value; the chart adds an imbalance % line.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)} />
          Show on Stats dashboard
        </label>
      </div>
      <SaveRow onClose={onClose} onSave={handleSave} disabled={!name.trim() || !unit.trim()} />
      <BackRow onBack={onBack} />
    </>
  )
}

/* -------------------- Multiple values -------------------- */

interface DraftField {
  id: string
  label: string
  unit: string
}

function MultiForm({ goalId, onBack, onClose }: { goalId: string; onBack: () => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<Metric['direction']>('increase')
  const [aggregation, setAggregation] = useState<Metric['aggregation']>('sum')
  const [showOnDashboard, setShowOnDashboard] = useState(false)
  const [drafts, setDrafts] = useState<DraftField[]>(() => [
    { id: uid(), label: '', unit: '' },
    { id: uid(), label: '', unit: '' },
  ])
  const [primaryId, setPrimaryId] = useState(() => drafts[0].id)

  const ready =
    drafts.length >= 2 && drafts.every((d) => d.label.trim() && d.unit.trim()) && name.trim().length > 0

  function setDraft(id: string, patch: Partial<DraftField>) {
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function addDraft() {
    setDrafts((list) => [...list, { id: uid(), label: '', unit: '' }])
  }

  function removeDraft(id: string) {
    setDrafts((list) => (list.length <= 2 ? list : list.filter((d) => d.id !== id)))
    setPrimaryId((p) => (p === id ? '' : p))
  }

  async function handleSave() {
    if (!ready) return
    const fields: MetricField[] = drafts.map((d) => ({ id: d.id, label: d.label.trim(), unit: d.unit.trim() }))
    const primary = fields.find((f) => f.id === primaryId) ?? fields[0]
    await createMetric({
      goalId,
      name: name.trim(),
      unit: primary.unit,
      direction,
      aggregation,
      showOnDashboard,
      fields,
      primaryFieldId: primary.id,
      comparison: 'none',
    })
    onClose()
  }

  return (
    <>
      <div className="mt-3 space-y-3">
        <label className="block text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Values</p>
          {drafts.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="primary-field"
                aria-label={`${d.label || 'field'} is primary`}
                checked={primaryId === d.id}
                onChange={() => setPrimaryId(d.id)}
              />
              <input
                value={d.label}
                onChange={(e) => setDraft(d.id, { label: e.target.value })}
                placeholder="Label, e.g. Time"
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
                onClick={() => removeDraft(d.id)}
                disabled={drafts.length <= 2}
                className="shrink-0 text-xs opacity-50 disabled:opacity-20"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={addDraft} className="text-sm font-medium text-accent">
            + Add value
          </button>
          <p className="text-xs opacity-50">The selected radio is the primary value (used on the Stats dashboard).</p>
        </div>

        <DirectionAndAggregation
          direction={direction}
          setDirection={setDirection}
          aggregation={aggregation}
          setAggregation={setAggregation}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)} />
          Show on Stats dashboard
        </label>
      </div>
      <SaveRow onClose={onClose} onSave={handleSave} disabled={!ready} />
      <BackRow onBack={onBack} />
    </>
  )
}
