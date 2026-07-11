import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db'
import { todayISO, weekdayMon0 } from '../lib/date'
import { toggleRoutineCheck } from '../lib/actions'
import QuickEntrySheet from './QuickEntrySheet'

export default function RoutineChecklist() {
  const today = todayISO()
  const todayWeekday = weekdayMon0(today)
  const [quickEntryRoutine, setQuickEntryRoutine] = useState<Routine | null>(null)

  const routines = useLiveQuery(
    () => db.routines.filter((r) => r.active && r.schedule.includes(todayWeekday)).toArray(),
    [todayWeekday],
  )
  const checks = useLiveQuery(() => db.routineChecks.where('date').equals(today).toArray(), [today])

  const isDone = (routineId: string) => checks?.find((c) => c.routineId === routineId)?.done ?? false

  async function handleToggle(routine: Routine) {
    const wasDone = isDone(routine.id)
    await toggleRoutineCheck(routine.id, today)
    if (!wasDone && routine.quickMetricIds.length > 0) {
      setQuickEntryRoutine(routine)
    }
  }

  if (!routines) return null

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Checklist</h2>
      {routines.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">No routines scheduled today.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {routines.map((routine) => (
            <li key={routine.id} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => handleToggle(routine)}
                aria-pressed={isDone(routine.id)}
                className={`h-6 w-6 shrink-0 rounded-full border-2 ${
                  isDone(routine.id) ? 'border-accent bg-accent' : 'border-ink/30'
                }`}
              />
              <span className={isDone(routine.id) ? 'line-through opacity-50' : ''}>{routine.name}</span>
            </li>
          ))}
        </ul>
      )}

      {quickEntryRoutine && (
        <QuickEntrySheet routine={quickEntryRoutine} date={today} onClose={() => setQuickEntryRoutine(null)} />
      )}
    </div>
  )
}
