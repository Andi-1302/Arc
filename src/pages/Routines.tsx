import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db'
import { setRoutineActive } from '../lib/actions'
import { WEEKDAY_LABELS } from '../lib/date'
import RoutineFormSheet from '../components/RoutineFormSheet'

function scheduleLabel(schedule: number[]): string {
  if (schedule.length === 7) return 'Daily'
  if (schedule.length === 0) return 'No days set'
  return [...schedule]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d])
    .join(' ')
}

export default function Routines() {
  const routines = useLiveQuery(() => db.routines.toArray())
  const goals = useLiveQuery(() => db.goals.where('status').notEqual('archived').toArray())
  const [editing, setEditing] = useState<Routine | null>(null)
  const [creating, setCreating] = useState(false)

  const routineGoals = goals?.filter((g) => g.modules.includes('routines')) ?? []

  function goalNames(ids: string[]): string {
    if (!goals) return ''
    return ids
      .map((id) => goals.find((g) => g.id === id)?.name)
      .filter((n): n is string => Boolean(n))
      .join(', ')
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/more" className="text-sm font-medium text-accent">
            ‹ More
          </Link>
          <h1 className="mt-1 font-display text-3xl font-semibold">Routines</h1>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="text-sm font-medium text-accent">
          + New
        </button>
      </div>

      {!routines ? null : routines.length === 0 ? (
        <p className="mt-6 text-sm opacity-60">No routines yet — add one to start filling the Today checklist.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/5 overflow-hidden rounded-xl border border-black/5 bg-surface">
          {routines.map((routine) => (
            <li
              key={routine.id}
              className={`flex items-center gap-3 px-4 py-3 ${routine.active ? '' : 'opacity-50'}`}
            >
              <button type="button" onClick={() => setEditing(routine)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{routine.name}</p>
                <p className="mt-0.5 truncate text-xs opacity-60">
                  {scheduleLabel(routine.schedule)}
                  {goalNames(routine.goalIds) && ` · ${goalNames(routine.goalIds)}`}
                </p>
              </button>
              <input
                type="checkbox"
                checked={routine.active}
                onChange={(e) => setRoutineActive(routine.id, e.target.checked)}
                aria-label={routine.active ? 'Deactivate routine' : 'Activate routine'}
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
      )}

      {creating && <RoutineFormSheet goals={routineGoals} onClose={() => setCreating(false)} />}
      {editing && <RoutineFormSheet routine={editing} goals={routineGoals} onClose={() => setEditing(null)} />}
    </div>
  )
}
