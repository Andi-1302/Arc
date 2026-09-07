import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Todo } from '../db'
import { deleteTodo, updateTodo } from '../lib/actions'
import PriorityChips from './PriorityChips'

export default function TodoFormSheet({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const goals = useLiveQuery(() => db.goals.where('status').notEqual('archived').sortBy('name'))
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
  const [title, setTitle] = useState(todo.title)
  const [dueDate, setDueDate] = useState(todo.dueDate ?? '')
  const [goalId, setGoalId] = useState(todo.goalId ?? '')
  const [areaId, setAreaId] = useState(todo.areaId)
  const [priority, setPriority] = useState<0 | 1 | 2>(todo.priority ?? 0)
  const [note, setNote] = useState(todo.note ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    await updateTodo(todo.id, {
      title: title.trim(),
      dueDate: dueDate || undefined,
      goalId: goalId || undefined,
      areaId,
      priority,
      note: note.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${todo.title}"? This can't be undone.`)) return
    await deleteTodo(todo.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Edit todo</h3>
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
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>

          <div>
            <p className="text-sm">Priority</p>
            <div className="mt-1.5">
              <PriorityChips value={priority} onChange={setPriority} size="md" />
            </div>
          </div>

          <label className="block text-sm">
            Due date (optional)
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Goal (optional)
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            >
              <option value="">No goal</option>
              {goals?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-sm opacity-70">Area (optional)</p>
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

          <label className="block text-sm">
            Note (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
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

        <div className="mt-4 border-t border-black/5 pt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
