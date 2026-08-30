import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db, type Metric, type MetricEntry } from '../db'
import { useToday } from '../lib/useToday'
import { aggregateWeekly } from '../lib/metrics'
import { addMetricEntry, deleteMetricEntry, updateMetricEntry } from '../lib/actions'
import EditMetricSheet from './EditMetricSheet'

export default function MetricBlock({ metric }: { metric: Metric }) {
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
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-medium">
          {metric.name} <span className="opacity-50">({metric.unit})</span>
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
            onClick={() => setView('raw')}
            className={view === 'raw' ? 'font-semibold text-accent' : 'opacity-50'}
          >
            Raw
          </button>
          <span className="opacity-30">/</span>
          <button
            type="button"
            onClick={() => setView('weekly')}
            className={view === 'weekly' ? 'font-semibold text-accent' : 'opacity-50'}
          >
            Weekly
          </button>
          <span className="opacity-30">·</span>
          <button type="button" onClick={() => setEditingMetric(true)} className="opacity-50">
            Edit
          </button>
        </div>
      </div>

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
