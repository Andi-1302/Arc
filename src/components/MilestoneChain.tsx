import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addMilestone, deleteMilestone, toggleMilestone } from '../lib/actions'

export default function MilestoneChain({ goalId }: { goalId: string }) {
  const milestones = useLiveQuery(() => db.milestones.where('goalId').equals(goalId).sortBy('sortOrder'), [goalId])
  const [title, setTitle] = useState('')
  const [celebrating, setCelebrating] = useState<string | null>(null)

  async function handleAdd() {
    if (!title.trim()) return
    await addMilestone(goalId, title.trim())
    setTitle('')
  }

  async function handleToggle(id: string, done: boolean) {
    await toggleMilestone(id, !done)
    if (!done) {
      setCelebrating(id)
      setTimeout(() => setCelebrating((c) => (c === id ? null : c)), 300)
    }
  }

  if (!milestones) return null

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Milestones</h2>
      {milestones.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">No milestones yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggle(m.id, m.done)}
                aria-pressed={m.done}
                className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                  m.done ? 'border-accent bg-accent' : 'border-ink/30'
                } ${celebrating === m.id ? 'milestone-pop' : ''}`}
              />
              <span className={`flex-1 text-sm ${m.done ? 'line-through opacity-50' : ''}`}>{m.title}</span>
              <button
                type="button"
                onClick={() => deleteMilestone(m.id)}
                aria-label="Delete milestone"
                className="px-1 text-xs opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add milestone"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button type="button" onClick={handleAdd} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
          Add
        </button>
      </div>
    </div>
  )
}
