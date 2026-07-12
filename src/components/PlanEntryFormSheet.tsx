import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PlanEntry, type PlanRecurrence } from '../db'
import { todayISO, weekdayMon0, WEEKDAY_LABELS } from '../lib/date'
import { createPlanEntry, deletePlanEntry, updatePlanEntry } from '../lib/actions'

const DEFAULT_DURATION = 60

export default function PlanEntryFormSheet({
  entry,
  defaultDate,
  defaultTime,
  onClose,
}: {
  entry?: PlanEntry
  defaultDate?: string
  defaultTime?: string
  onClose: () => void
}) {
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())

  const [title, setTitle] = useState(entry?.title ?? '')
  const [time, setTime] = useState(entry?.time ?? defaultTime ?? '')
  const [durationMin, setDurationMin] = useState(entry?.durationMin ?? DEFAULT_DURATION)
  const [areaId, setAreaId] = useState<string | undefined>(entry?.areaId)
  const [recurrence, setRecurrence] = useState<PlanRecurrence>(entry?.recurrence ?? 'once')
  const [date, setDate] = useState(entry?.date ?? defaultDate ?? todayISO())
  const [weekday, setWeekday] = useState(entry?.weekday ?? weekdayMon0(defaultDate ?? todayISO()))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const patch = {
      title: title.trim(),
      time: time || undefined,
      durationMin: time ? durationMin : undefined,
      areaId,
      recurrence,
      date: recurrence === 'once' ? date : undefined,
      weekday: recurrence === 'weekly' ? weekday : undefined,
    }
    if (entry) await updatePlanEntry(entry.id, patch)
    else await createPlanEntry(patch)
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!entry) return
    if (!window.confirm(`Delete "${entry.title}"? This can't be undone.`)) return
    await deletePlanEntry(entry.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{entry ? 'Edit plan entry' : 'New plan entry'}</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Anatomy lecture"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-sm">
              Time (optional)
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              />
            </label>
            {time && (
              <label className="flex-1 text-sm">
                Duration (min)
                <input
                  type="number"
                  step={15}
                  min={15}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value) || DEFAULT_DURATION)}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
                />
              </label>
            )}
          </div>

          <div>
            <p className="text-sm opacity-70">Color by area (optional)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAreaId(undefined)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  !areaId ? 'border-accent bg-accent/5 text-accent' : 'border-black/10'
                }`}
              >
                None
              </button>
              {areas?.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setAreaId(area.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                    areaId === area.id ? 'border-accent bg-accent/5 text-accent' : 'border-black/10'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: area.color }} />
                  {area.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm opacity-70">Repeats</p>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setRecurrence('once')}
                className={`flex-1 rounded-lg border py-2 text-sm ${
                  recurrence === 'once' ? 'border-accent bg-accent/5 text-accent' : 'border-black/10'
                }`}
              >
                Once
              </button>
              <button
                type="button"
                onClick={() => setRecurrence('weekly')}
                className={`flex-1 rounded-lg border py-2 text-sm ${
                  recurrence === 'weekly' ? 'border-accent bg-accent/5 text-accent' : 'border-black/10'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {recurrence === 'once' ? (
            <label className="block text-sm">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              />
            </label>
          ) : (
            <div>
              <p className="text-sm opacity-70">Weekday</p>
              <div className="mt-1.5 flex gap-1">
                {WEEKDAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setWeekday(day)}
                    className={`h-8 w-8 rounded-full text-xs font-medium ${
                      weekday === day ? 'bg-accent text-white' : 'bg-black/5 text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        {entry && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
            >
              Delete entry
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
