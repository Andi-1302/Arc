import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PlanEntry, type Routine } from '../db'
import { todayISO, weekdayMon0 } from '../lib/date'
import { entriesForDate, sortChecklist } from '../lib/planEntries'
import { toggleRoutineCheck, togglePlanEntryCheck } from '../lib/actions'
import QuickEntrySheet from './QuickEntrySheet'

const UNDO_TIMEOUT_MS = 5000

interface UndoState {
  kind: 'routine' | 'plan'
  id: string
  name: string
  wasDone: boolean
}

export default function Checklist() {
  const today = todayISO()
  const todayWeekday = weekdayMon0(today)
  const [quickEntryRoutine, setQuickEntryRoutine] = useState<Routine | null>(null)
  const [undo, setUndo] = useState<UndoState | null>(null)
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (undoTimeout.current) clearTimeout(undoTimeout.current)
    },
    [],
  )

  const routines = useLiveQuery(
    () => db.routines.filter((r) => r.active && r.schedule.includes(todayWeekday)).toArray(),
    [todayWeekday],
  )
  const routineChecks = useLiveQuery(() => db.routineChecks.where('date').equals(today).toArray(), [today])
  const planEntries = useLiveQuery(
    () => db.planEntries.toArray().then((all) => entriesForDate(all, today)),
    [today],
  )
  const planChecks = useLiveQuery(() => db.planEntryChecks.where('date').equals(today).toArray(), [today])

  const isRoutineDone = (id: string) => routineChecks?.find((c) => c.routineId === id)?.done ?? false
  const isPlanDone = (id: string) => planChecks?.find((c) => c.planEntryId === id)?.done ?? false

  function armUndo(next: UndoState) {
    if (undoTimeout.current) clearTimeout(undoTimeout.current)
    setUndo(next)
    undoTimeout.current = setTimeout(() => setUndo(null), UNDO_TIMEOUT_MS)
  }

  async function handleToggleRoutine(routine: Routine) {
    const wasDone = isRoutineDone(routine.id)
    await toggleRoutineCheck(routine.id, today)
    if (!wasDone && routine.quickMetricIds.length > 0) {
      setQuickEntryRoutine(routine)
    }
    armUndo({ kind: 'routine', id: routine.id, name: routine.name, wasDone })
  }

  async function handleTogglePlan(entry: PlanEntry) {
    const wasDone = isPlanDone(entry.id)
    await togglePlanEntryCheck(entry.id, today)
    armUndo({ kind: 'plan', id: entry.id, name: entry.title, wasDone })
  }

  async function handleUndo() {
    if (!undo) return
    if (undoTimeout.current) clearTimeout(undoTimeout.current)
    if (undo.kind === 'routine') await toggleRoutineCheck(undo.id, today)
    else await togglePlanEntryCheck(undo.id, today)
    setUndo(null)
  }

  if (!routines || !planEntries) return null

  const items = sortChecklist([
    ...routines.map((r) => ({
      key: `r-${r.id}`,
      title: r.name,
      time: undefined as string | undefined,
      done: isRoutineDone(r.id),
      onToggle: () => handleToggleRoutine(r),
    })),
    ...planEntries.map((e) => ({
      key: `p-${e.id}`,
      title: e.title,
      time: e.time,
      done: isPlanDone(e.id),
      onToggle: () => handleTogglePlan(e),
    })),
  ])

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Checklist</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">Nothing scheduled today.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={item.onToggle}
                aria-pressed={item.done}
                className={`h-6 w-6 shrink-0 rounded-full border-2 ${
                  item.done ? 'border-accent bg-accent' : 'border-ink/30'
                }`}
              />
              <span className={`flex-1 ${item.done ? 'line-through opacity-50' : ''}`}>{item.title}</span>
              {item.time && <span className="shrink-0 text-xs tabular-nums opacity-50">{item.time}</span>}
            </li>
          ))}
        </ul>
      )}

      {quickEntryRoutine && (
        <QuickEntrySheet routine={quickEntryRoutine} date={today} onClose={() => setQuickEntryRoutine(null)} />
      )}

      {undo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
            <span>
              {undo.wasDone ? 'Unchecked' : 'Checked'} {undo.name}
            </span>
            <button type="button" onClick={handleUndo} className="font-semibold underline decoration-2">
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
