import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { deleteGoalPermanently, restoreGoal } from '../lib/actions'

export default function More() {
  const archived = useLiveQuery(() => db.goals.where('status').equals('archived').toArray())

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" permanently? This can't be undone.`)) return
    await deleteGoalPermanently(id)
  }

  return (
    <div className="p-4">
      <h1 className="font-display text-3xl font-semibold">More</h1>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">Archive</h2>
        {!archived || archived.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">No archived goals.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {archived.map((goal) => (
              <li key={goal.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-sm">{goal.name}</span>
                <span className="flex shrink-0 gap-3 text-sm font-medium">
                  <button type="button" onClick={() => restoreGoal(goal.id)} className="text-accent">
                    Restore
                  </button>
                  <button type="button" onClick={() => handleDelete(goal.id, goal.name)} className="text-warning">
                    Delete permanently
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-sm opacity-70">Cycles, weekly reviews and settings land here in build phases 4 and 8.</p>
    </div>
  )
}
