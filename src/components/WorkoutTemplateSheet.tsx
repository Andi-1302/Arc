import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { TemplateExercise, WorkoutTemplate } from '../db'
import { createWorkoutTemplate, setWorkoutTemplateArchived, updateWorkoutTemplate } from '../lib/actions'

const uid = () => crypto.randomUUID()

interface DraftExercise {
  id: string
  name: string
  targetSets: string
  targetReps: string
  targetWeight: string
  perSide: boolean
  note: string
}

function toDraft(ex: TemplateExercise): DraftExercise {
  return {
    id: ex.id,
    name: ex.name,
    targetSets: String(ex.targetSets),
    targetReps: ex.targetReps !== undefined ? String(ex.targetReps) : '',
    targetWeight: ex.targetWeight !== undefined ? String(ex.targetWeight) : '',
    perSide: ex.perSide,
    note: ex.note ?? '',
  }
}

const emptyDraft = (): DraftExercise => ({
  id: uid(),
  name: '',
  targetSets: '3',
  targetReps: '',
  targetWeight: '',
  perSide: false,
  note: '',
})

export default function WorkoutTemplateSheet({
  template,
  goalId,
  onClose,
}: {
  template?: WorkoutTemplate
  goalId: string
  onClose: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [drafts, setDrafts] = useState<DraftExercise[]>(() =>
    template ? template.exercises.map(toDraft) : [emptyDraft()],
  )
  const [saving, setSaving] = useState(false)

  function setDraft(id: string, patch: Partial<DraftExercise>) {
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  function move(id: string, dir: -1 | 1) {
    setDrafts((list) => {
      const i = list.findIndex((d) => d.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const ready = name.trim().length > 0 && drafts.some((d) => d.name.trim())

  async function handleSave() {
    if (!ready) return
    setSaving(true)
    const exercises: TemplateExercise[] = drafts
      .filter((d) => d.name.trim())
      .map((d, i) => ({
        id: d.id,
        name: d.name.trim(),
        targetSets: Math.max(1, Math.round(Number(d.targetSets) || 1)),
        targetReps: d.targetReps.trim() ? Number(d.targetReps) : undefined,
        targetWeight: d.targetWeight.trim() ? Number(d.targetWeight) : undefined,
        perSide: d.perSide,
        note: d.note.trim() || undefined,
        sortOrder: i,
      }))
    if (template) {
      await updateWorkoutTemplate(template.id, { name: name.trim(), exercises })
    } else {
      await createWorkoutTemplate({ name: name.trim(), goalId, exercises })
    }
    setSaving(false)
    onClose()
  }

  async function handleArchive() {
    if (!template) return
    if (!window.confirm(`Archive "${template.name}"? Templates are kept, never deleted.`)) return
    await setWorkoutTemplateArchived(template.id, true)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{template ? 'Edit template' : 'New template'}</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <label className="mt-3 block text-sm">
          Template name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push day, Legs, Upper A…"
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>

        <p className="mt-4 text-sm font-medium">Exercises</p>
        <div className="mt-2 space-y-3">
          {drafts.map((d, i) => (
            <div key={d.id} className="rounded-lg border border-black/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={d.name}
                  onChange={(e) => setDraft(d.id, { name: e.target.value })}
                  placeholder="Exercise name"
                  className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(d.id, -1)}
                  disabled={i === 0}
                  className="px-1 text-sm opacity-50 disabled:opacity-20"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(d.id, 1)}
                  disabled={i === drafts.length - 1}
                  className="px-1 text-sm opacity-50 disabled:opacity-20"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove exercise"
                  onClick={() => setDrafts((list) => list.filter((x) => x.id !== d.id))}
                  className="px-1 text-xs opacity-40"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="text-xs">
                  Sets
                  <input
                    type="number"
                    inputMode="numeric"
                    value={d.targetSets}
                    onChange={(e) => setDraft(d.id, { targetSets: e.target.value })}
                    className="mt-0.5 block w-14 rounded border border-black/10 px-1.5 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  Reps
                  <input
                    type="number"
                    inputMode="numeric"
                    value={d.targetReps}
                    onChange={(e) => setDraft(d.id, { targetReps: e.target.value })}
                    className="mt-0.5 block w-14 rounded border border-black/10 px-1.5 py-1 text-sm"
                  />
                </label>
                <label className="text-xs">
                  Weight (kg)
                  <input
                    type="number"
                    inputMode="decimal"
                    value={d.targetWeight}
                    onChange={(e) => setDraft(d.id, { targetWeight: e.target.value })}
                    className="mt-0.5 block w-20 rounded border border-black/10 px-1.5 py-1 text-sm"
                  />
                </label>
                <label className="flex items-end gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={d.perSide}
                    onChange={(e) => setDraft(d.id, { perSide: e.target.checked })}
                  />
                  Per side (left / right)
                </label>
              </div>
              <input
                value={d.note}
                onChange={(e) => setDraft(d.id, { note: e.target.value })}
                placeholder="Note (optional)"
                className="mt-2 w-full rounded border border-black/10 px-2 py-1 text-xs"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDrafts((list) => [...list, emptyDraft()])}
          className="mt-2 text-sm font-medium text-accent"
        >
          + Add exercise
        </button>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !ready}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save template
          </button>
        </div>

        {template && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={handleArchive}
              className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
            >
              Archive template
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
