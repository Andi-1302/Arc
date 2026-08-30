import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { db, type Metric, type MetricEntry, type MetricField } from '../db'
import { useToday } from '../lib/useToday'
import { aggregateWeekly, aggregateWeeklyByField, imbalanceSeries } from '../lib/metrics'
import {
  addMetricEntry,
  addMetricFieldEntry,
  deleteMetricEntry,
  updateMetricEntry,
  updateMetricFieldEntry,
} from '../lib/actions'
import EditMetricSheet from './EditMetricSheet'

const FIELD_COLORS = [
  'var(--color-accent)',
  'var(--color-warning)',
  'var(--color-success)',
  '#7c3aed',
  '#0891b2',
  '#db2777',
]
const GAP_COLOR = 'var(--color-ink)'

const EM_DASH = '—'

export default function MetricBlock({ metric }: { metric: Metric }) {
  // db.ts compatibility rule: no `fields` ⇒ legacy single-value metric, rendered exactly as before.
  if (metric.fields && metric.fields.length > 0) {
    return <MultiFieldMetricBlock metric={metric} fields={metric.fields} />
  }
  return <SingleValueMetricBlock metric={metric} />
}

function MetricHeader({
  metric,
  subtitle,
  view,
  onView,
  onEdit,
}: {
  metric: Metric
  subtitle: string
  view: 'raw' | 'weekly'
  onView: (v: 'raw' | 'weekly') => void
  onEdit: () => void
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="min-w-0 truncate text-sm font-medium">
        {metric.name} <span className="opacity-50">({subtitle})</span>
        {metric.showOnDashboard && (
          <span
            className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle"
            title="Shown on Stats dashboard"
          />
        )}
      </h3>
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => onView('raw')}
          className={view === 'raw' ? 'font-semibold text-accent' : 'opacity-50'}
        >
          Raw
        </button>
        <span className="opacity-30">/</span>
        <button
          type="button"
          onClick={() => onView('weekly')}
          className={view === 'weekly' ? 'font-semibold text-accent' : 'opacity-50'}
        >
          Weekly
        </button>
        <span className="opacity-30">·</span>
        <button type="button" onClick={onEdit} className="opacity-50">
          Edit
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Legacy single-value metric — behaviour unchanged.
 * ------------------------------------------------------------------ */

function SingleValueMetricBlock({ metric }: { metric: Metric }) {
  const today = useToday()
  const entries = useLiveQuery(() => db.entries.where('metricId').equals(metric.id).sortBy('date'), [metric.id])
  const [view, setView] = useState<'raw' | 'weekly'>('weekly')
  const [date, setDate] = useState(today)
  const [value, setValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingMetric, setEditingMetric] = useState(false)

  if (!entries) return null

  const weekly = aggregateWeekly(entries, metric.aggregation)
  const raw = entries.map((e) => ({ date: e.date, value: e.value }))

  async function handleAdd() {
    const num = Number(value)
    if (!date || Number.isNaN(num) || value === '') return
    await addMetricEntry(metric.id, date, num)
    setValue('')
  }

  return (
    <div>
      <MetricHeader
        metric={metric}
        subtitle={metric.unit}
        view={view}
        onView={setView}
        onEdit={() => setEditingMetric(true)}
      />

      <div className="mt-2 h-40">
        {entries.length === 0 ? (
          <p className="text-sm opacity-50">No entries yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {view === 'raw' ? (
              <LineChart data={raw}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            ) : (
              <BarChart data={weekly}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          inputMode="decimal"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
        />
        <button type="button" onClick={handleAdd} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">
          Add
        </button>
      </div>

      {entries.length > 0 && (
        <ul className="mt-2 divide-y divide-black/5 text-sm">
          {[...entries].reverse().map((e) =>
            editingId === e.id ? (
              <EntryEditRow key={e.id} entry={e} onDone={() => setEditingId(null)} />
            ) : (
              <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="opacity-70">{e.date}</span>
                <span className="flex-1 truncate text-right tabular-nums">
                  {e.value}
                  {e.note ? ` · ${e.note}` : ''}
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEditingId(e.id)} className="text-xs opacity-50">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteMetricEntry(e.id)} className="text-xs opacity-50">
                    Delete
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      {editingMetric && <EditMetricSheet metric={metric} onClose={() => setEditingMetric(false)} />}
    </div>
  )
}

function EntryEditRow({ entry, onDone }: { entry: MetricEntry; onDone: () => void }) {
  const [date, setDate] = useState(entry.date)
  const [value, setValue] = useState(String(entry.value))
  const [note, setNote] = useState(entry.note ?? '')

  async function handleSave() {
    const num = Number(value)
    if (Number.isNaN(num) || value === '') return
    await updateMetricEntry(entry.id, { date, value: num, note: note || undefined })
    onDone()
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border border-black/10 px-1.5 py-1 text-xs"
      />
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-16 rounded border border-black/10 px-1.5 py-1 text-xs"
      />
      <input
        type="text"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-w-0 flex-1 rounded border border-black/10 px-1.5 py-1 text-xs"
      />
      <button type="button" onClick={handleSave} className="text-xs font-medium text-accent">
        Save
      </button>
      <button type="button" onClick={onDone} className="text-xs opacity-50">
        Cancel
      </button>
    </li>
  )
}

/* ------------------------------------------------------------------ *
 * Multi-field metric — one entry holds several named values.
 * ------------------------------------------------------------------ */

function gapPercent(left: number, right: number): number {
  const larger = Math.max(Math.abs(left), Math.abs(right))
  return larger === 0 ? 0 : (Math.abs(left - right) / larger) * 100
}

function MultiFieldMetricBlock({ metric, fields }: { metric: Metric; fields: MetricField[] }) {
  const today = useToday()
  const entries = useLiveQuery(() => db.entries.where('metricId').equals(metric.id).sortBy('date'), [metric.id])
  const [view, setView] = useState<'raw' | 'weekly'>('weekly')
  const [date, setDate] = useState(today)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingMetric, setEditingMetric] = useState(false)

  if (!entries) return null

  const isLeftRight = metric.comparison === 'leftRight'
  const leftId = metric.primaryFieldId ?? fields[0]?.id
  const rightId = fields.find((f) => f.id !== leftId)?.id ?? fields[1]?.id
  const leftLabel = fields.find((f) => f.id === leftId)?.label ?? 'L'
  const rightLabel = fields.find((f) => f.id === rightId)?.label ?? 'R'

  const perField = aggregateWeeklyByField(entries, fields, metric.aggregation)
  const weeks = [...new Set(perField.flatMap((f) => f.points.map((p) => p.week)))].sort()

  const gapSeries = isLeftRight && leftId && rightId ? imbalanceSeries(entries, leftId, rightId) : []
  const gapWeekly =
    gapSeries.length > 0
      ? aggregateWeekly(
          gapSeries.map((g) => ({ id: '', metricId: metric.id, date: g.date, value: g.gap })),
          'avg',
        )
      : []

  const weeklyData = weeks.map((week) => {
    const row: Record<string, number | string> = { x: week }
    for (const f of perField) {
      const pt = f.points.find((p) => p.week === week)
      if (pt) row[f.fieldId] = pt.value
    }
    const g = gapWeekly.find((p) => p.week === week)
    if (g) row.__gap = g.value
    return row
  })

  const rawData = entries.map((e) => {
    const row: Record<string, number | string> = { x: e.date }
    for (const f of fields) {
      const v = e.values?.[f.id]
      if (v !== undefined) row[f.id] = v
    }
    if (isLeftRight && leftId && rightId) {
      const l = e.values?.[leftId]
      const r = e.values?.[rightId]
      if (l !== undefined && r !== undefined) row.__gap = gapPercent(l, r)
    }
    return row
  })

  const latestGap = gapSeries[gapSeries.length - 1]
  const prevGap = gapSeries[gapSeries.length - 2]
  const gapClosing = latestGap && prevGap ? latestGap.gap - prevGap.gap : null

  async function handleAdd() {
    const values = collectValues(fields, inputs)
    if (!date || Object.keys(values).length === 0) return
    await addMetricFieldEntry(metric.id, date, values, note || undefined)
    setInputs({})
    setNote('')
  }

  const chartData = view === 'raw' ? rawData : weeklyData

  return (
    <div>
      <MetricHeader
        metric={metric}
        subtitle={fields.map((f) => f.unit).join(' / ')}
        view={view}
        onView={setView}
        onEdit={() => setEditingMetric(true)}
      />
      <p className="mt-0.5 text-xs opacity-50">{fields.map((f) => `${f.label} in ${f.unit}`).join(' · ')}</p>

      <div className="mt-2 h-44">
        {entries.length === 0 ? (
          <p className="text-sm opacity-50">No entries yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="x" tick={{ fontSize: 10 }} tickFormatter={(d: string) => String(d).slice(5)} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {fields.map((f, i) => (
                <Line
                  key={f.id}
                  type="monotone"
                  dataKey={f.id}
                  name={f.label}
                  stroke={FIELD_COLORS[i % FIELD_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
              {isLeftRight && (
                <Line
                  type="monotone"
                  dataKey="__gap"
                  name="Imbalance %"
                  stroke={GAP_COLOR}
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {isLeftRight && latestGap && (
        <p className="mt-1 text-sm">
          Latest imbalance:{' '}
          <span className="font-display font-semibold tabular-nums">{Math.round(latestGap.gap)}%</span>{' '}
          {gapClosing !== null && gapClosing < 0 && <span className="text-success">↓ closing</span>}
          {gapClosing !== null && gapClosing > 0 && <span className="text-warning">↑ widening</span>}
          {(gapClosing === null || gapClosing === 0) && <span className="opacity-50">→ unchanged</span>}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm"
        />
        {fields.map((f) => (
          <input
            key={f.id}
            type="number"
            inputMode="decimal"
            placeholder={f.label}
            value={inputs[f.id] ?? ''}
            onChange={(e) => setInputs((s) => ({ ...s, [f.id]: e.target.value }))}
            className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
          />
        ))}
        <input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
        />
        <button type="button" onClick={handleAdd} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white">
          Add
        </button>
      </div>

      {entries.length > 0 && (
        <ul className="mt-2 divide-y divide-black/5 text-sm">
          {[...entries].reverse().map((e) =>
            editingId === e.id ? (
              <MultiEntryEditRow key={e.id} entry={e} fields={fields} onDone={() => setEditingId(null)} />
            ) : (
              <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="shrink-0 opacity-70">{e.date}</span>
                <span className="flex-1 truncate text-right tabular-nums">
                  {fields
                    .map((f) => `${f.label} ${e.values?.[f.id] ?? EM_DASH}`)
                    .join('  ·  ')}
                  {isLeftRight &&
                    leftId &&
                    rightId &&
                    e.values?.[leftId] !== undefined &&
                    e.values?.[rightId] !== undefined &&
                    `  ·  gap ${Math.round(gapPercent(e.values[leftId], e.values[rightId]))}%`}
                  {e.note ? ` · ${e.note}` : ''}
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEditingId(e.id)} className="text-xs opacity-50">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteMetricEntry(e.id)} className="text-xs opacity-50">
                    Delete
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      {isLeftRight && (
        <p className="mt-1 text-[11px] opacity-40">
          gap = |{leftLabel} − {rightLabel}| ÷ larger side × 100
        </p>
      )}

      {editingMetric && <EditMetricSheet metric={metric} onClose={() => setEditingMetric(false)} />}
    </div>
  )
}

function collectValues(fields: MetricField[], inputs: Record<string, string>): Record<string, number> {
  const values: Record<string, number> = {}
  for (const f of fields) {
    const raw = inputs[f.id]
    if (raw === undefined || raw.trim() === '') continue
    const num = Number(raw)
    if (!Number.isNaN(num)) values[f.id] = num
  }
  return values
}

function MultiEntryEditRow({
  entry,
  fields,
  onDone,
}: {
  entry: MetricEntry
  fields: MetricField[]
  onDone: () => void
}) {
  const [date, setDate] = useState(entry.date)
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.id, entry.values?.[f.id] !== undefined ? String(entry.values[f.id]) : '']),
    ),
  )
  const [note, setNote] = useState(entry.note ?? '')

  async function handleSave() {
    const values = collectValues(fields, inputs)
    if (Object.keys(values).length === 0) return
    await updateMetricFieldEntry(entry.id, { date, values, note: note || undefined })
    onDone()
  }

  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border border-black/10 px-1.5 py-1 text-xs"
      />
      {fields.map((f) => (
        <input
          key={f.id}
          type="number"
          inputMode="decimal"
          aria-label={f.label}
          placeholder={f.label}
          value={inputs[f.id] ?? ''}
          onChange={(e) => setInputs((s) => ({ ...s, [f.id]: e.target.value }))}
          className="w-16 rounded border border-black/10 px-1.5 py-1 text-xs"
        />
      ))}
      <input
        type="text"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-w-0 flex-1 rounded border border-black/10 px-1.5 py-1 text-xs"
      />
      <button type="button" onClick={handleSave} className="text-xs font-medium text-accent">
        Save
      </button>
      <button type="button" onClick={onDone} className="text-xs opacity-50">
        Cancel
      </button>
    </li>
  )
}
