import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LoggedSet, type TemplateExercise, type WorkoutTemplate } from '../db'
import { createWorkoutSession } from '../lib/actions'
import { exerciseLine, lastSetForExercise, seedSetsForExercise } from '../lib/workouts'

const uid = () => crypto.randomUUID()

interface Row {
  id: string
  setIndex: number
  side?: 'left' | 'right' | 'both'
  weight: string
  reps: string
  done: boolean
}

function seedRows(template: WorkoutTemplate): Record<string, Row[]> {
  const out: Record<string, Row[]> = {}
  for (const ex of [...template.exercises].sort((a, b) => a.sortOrder - b.sortOrder)) {
    out[ex.id] = seedSetsForExercise(ex).map((s) => ({
      id: uid(),
      setIndex: s.setIndex,
      side: s.side,
      weight: s.weight !== undefined ? String(s.weight) : '',
      reps: s.reps !== undefined ? String(s.reps) : '',
      done: false,
    }))
  }
  return out
}

function rowsToSets(exercise: TemplateExercise, rows: Row[]): LoggedSet[] {
  const sets: LoggedSet[] = []
  for (const row of rows) {
    const weight = row.weight.trim() ? Number(row.weight) : undefined
    const reps = row.reps.trim() ? Number(row.reps) : undefined
    if (weight === undefined && reps === undefined && !row.done) continue
    sets.push({
      id: row.id,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setIndex: row.setIndex,
      weight,
      reps,
      side: row.side,
      done: row.done,
    })
  }
  return sets
}

export default function WorkoutLoggerSheet({
  template,
  goalId,
  date,
  onClose,
  onSaved,
}: {
  template: WorkoutTemplate
  goalId?: string
  date: string
  onClose: () => void
  onSaved?: () => void
}) {
  const sessions = useLiveQuery(() => db.workoutSessions.toArray()) ?? []
  const exercises = useMemo(
    () => [...template.exercises].sort((a, b) => a.sortOrder - b.sortOrder),
    [template.exercises],
  )

  const [when, setWhen] = useState(date)
  const [note, setNote] = useState('')
  const [duration, setDuration] = useState('')
  const [rows, setRows] = useState<Record<string, Row[]>>(() => seedRows(template))
  const [collapse, setCollapse] = useState<Record<string, boolean | undefined>>({})
  const [saving, setSaving] = useState(false)

  function updateRow(exId: string, rowId: string, patch: Partial<Row>) {
    setRows((all) => ({
      ...all,
      [exId]: (all[exId] ?? []).map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }))
  }

  function copyLastTime(ex: TemplateExercise) {
    const last = lastSetForExercise(sessions, ex.name)
    if (!last) return
    setRows((all) => ({
      ...all,
      [ex.id]: (all[ex.id] ?? []).map((r) => ({
        ...r,
        weight: last.weight !== undefined ? String(last.weight) : r.weight,
        reps: last.reps !== undefined ? String(last.reps) : r.reps,
      })),
    }))
  }

  const allDone = (exId: string) => {
    const list = rows[exId] ?? []
    return list.length > 0 && list.every((r) => r.done)
  }

  async function handleSave() {
    setSaving(true)
    const sets = exercises.flatMap((ex) => rowsToSets(ex, rows[ex.id] ?? []))
    await createWorkoutSession({
      date: when,
      name: template.name,
      templateId: template.id,
      goalId: template.goalId ?? goalId,
      sets,
      note: note.trim() || undefined,
      durationMin: duration.trim() ? Number(duration) : undefined,
    })
    setSaving(false)
    onSaved?.()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Log · {template.name}</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="text-xs">
            Date
            <input
              type="date"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="mt-0.5 block rounded-lg border border-black/10 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs">
            Duration (min)
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-0.5 block w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 space-y-2">
          {exercises.map((ex) => {
            const list = rows[ex.id] ?? []
            const collapsed = collapse[ex.id] ?? allDone(ex.id)
            const doneSets = rowsToSets(ex, list).filter((s) => s.done)
            const bySet = new Map<number, Row[]>()
            for (const r of list) {
              const arr = bySet.get(r.setIndex) ?? []
              arr.push(r)
              bySet.set(r.setIndex, arr)
            }

            return (
              <div key={ex.id} className="rounded-lg border border-black/10">
                <button
                  type="button"
                  onClick={() => setCollapse((c) => ({ ...c, [ex.id]: !collapsed }))}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{ex.name}</span>
                    {collapsed ? (
                      <span className="block text-xs opacity-60">
                        {doneSets.length > 0 ? exerciseLine(ex.name, doneSets).replace(`${ex.name} · `, '') : 'Not logged'}
                      </span>
                    ) : (
                      <span className="block text-xs opacity-50">
                        Target {ex.targetSets}
                        {ex.targetReps ? `×${ex.targetReps}` : ''}
                        {ex.targetWeight ? ` @ ${ex.targetWeight} kg` : ''}
                        {ex.perSide ? ' · per side' : ''}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs opacity-40">{collapsed ? '▸' : '▾'}</span>
                </button>

                {!collapsed && (
                  <div className="border-t border-black/5 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => copyLastTime(ex)}
                      className="mb-2 rounded-lg border border-black/10 px-2 py-1 text-xs font-medium text-accent"
                    >
                      Copy last time
                    </button>
                    {ex.note && <p className="mb-2 text-xs opacity-50">{ex.note}</p>}

                    <div className="space-y-1.5">
                      {[...bySet.entries()].map(([setIndex, setRows]) => (
                        <div key={setIndex} className={`grid gap-1.5 ${ex.perSide ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {setRows.map((r) => (
                            <div key={r.id} className="flex items-center gap-1.5">
                              <span className="w-10 shrink-0 text-[11px] opacity-50">
                                {r.side && r.side !== 'both' ? `${r.side[0].toUpperCase()}${setIndex + 1}` : `Set ${setIndex + 1}`}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                aria-label={`${ex.name} ${r.side && r.side !== 'both' ? r.side + ' ' : ''}set ${setIndex + 1} weight`}
                                placeholder="kg"
                                value={r.weight}
                                onChange={(e) => updateRow(ex.id, r.id, { weight: e.target.value })}
                                className="w-14 rounded border border-black/10 px-1.5 py-1 text-sm"
                              />
                              <input
                                type="number"
                                inputMode="numeric"
                                aria-label={`${ex.name} ${r.side && r.side !== 'both' ? r.side + ' ' : ''}set ${setIndex + 1} reps`}
                                placeholder="reps"
                                value={r.reps}
                                onChange={(e) => updateRow(ex.id, r.id, { reps: e.target.value })}
                                className="w-14 rounded border border-black/10 px-1.5 py-1 text-sm"
                              />
                              <button
                                type="button"
                                aria-label={`Mark ${ex.name} ${r.side && r.side !== 'both' ? r.side + ' ' : ''}set ${setIndex + 1} done`}
                                aria-pressed={r.done}
                                onClick={() => updateRow(ex.id, r.id, { done: !r.done })}
                                className={`h-6 w-6 shrink-0 rounded-full border-2 ${
                                  r.done ? 'border-accent bg-accent' : 'border-ink/30'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Session note (optional)"
          className="mt-3 w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save workout
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
