import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Metric, type Routine } from '../db'
import { WEEKDAY_LABELS } from '../lib/date'
import { createRoutine, deleteRoutine, updateRoutine } from '../lib/actions'

export default function RoutineFormSheet({
  routine,
  goals,
  onClose,
}: {
  routine?: Routine
  goals: Goal[]
  onClose: () => void
}) {
  const [name, setName] = useState(routine?.name ?? '')
  const [schedule, setSchedule] = useState<number[]>(routine?.schedule ?? [0, 1, 2, 3, 4, 5, 6])
  const [goalIds, setGoalIds] = useState<string[]>(routine?.goalIds ?? [])
  const [quickMetricIds, setQuickMetricIds] = useState<string[]>(routine?.quickMetricIds ?? [])
  const [saving, setSaving] = useState(false)

  const metrics = useLiveQuery(
    () =>
      goalIds.length > 0 ? db.metrics.where('goalId').anyOf(goalIds).toArray() : Promise.resolve<Metric[]>([]),
    [goalIds],
  )

  function toggleDay(day: number) {
    setSchedule((s) => (s.includes(day) ? s.filter((d) => d !== day) : [...s, day].sort((a, b) => a - b)))
  }

  function toggleGoal(id: string) {
    setGoalIds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]))
  }

  function toggleMetric(id: string) {
    setQuickMetricIds((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const patch = {
      name: name.trim(),
      schedule,
      goalIds,
      quickMetricIds: quickMetricIds.filter((id) => metrics?.some((m) => m.id === id)),
    }
    if (routine) {
      await updateRoutine(routine.id, patch)
    } else {
      await createRoutine(patch)
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!routine) return
    if (!window.confirm(`Delete routine "${routine.name}"? This can't be undone.`)) return
    await deleteRoutine(routine.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{routine ? 'Edit routine' : 'New routine'}</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-4">
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>

          <div>
            <p className="text-sm opacity-70">Schedule</p>
            <div className="mt-2 flex gap-1">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`h-8 w-8 rounded-full text-xs font-medium ${
                    schedule.includes(day) ? 'bg-accent text-white' : 'bg-black/5 text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm opacity-70">Linked goals</p>
            {goals.length === 0 ? (
              <p className="mt-2 text-sm opacity-50">No goals have the routines module enabled yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {goals.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <input type="checkbox" checked={goalIds.includes(g.id)} onChange={() => toggleGoal(g.id)} />
                    {g.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm opacity-70">Quick-entry metrics (optional)</p>
            {goalIds.length === 0 ? (
              <p className="mt-2 text-sm opacity-50">Link a goal to offer its metrics here.</p>
            ) : !metrics || metrics.length === 0 ? (
              <p className="mt-2 text-sm opacity-50">Linked goals have no metrics yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {metrics.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={quickMetricIds.includes(m.id)}
                      onChange={() => toggleMetric(m.id)}
                    />
                    {m.name} <span className="opacity-60">({m.unit})</span>
                  </label>
                ))}
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
            disabled={saving || !name.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        {routine && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
            >
              Delete routine
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
