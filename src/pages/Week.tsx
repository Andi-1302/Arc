import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PlanEntry } from '../db'
import { addDays, isoWeekString, startOfIsoWeek, todayISO, weekdayMon0 } from '../lib/date'
import { entriesForDate, sortChecklist } from '../lib/planEntries'
import { getCurrentBlock } from '../lib/prioritized'
import PlanEntryFormSheet from '../components/PlanEntryFormSheet'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Week() {
  const today = todayISO()
  const weekStart = startOfIsoWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const routines = useLiveQuery(() => db.routines.filter((r) => r.active).toArray())
  const routineChecks = useLiveQuery(
    () => db.routineChecks.where('date').anyOf(days).toArray(),
    [weekStart],
  )
  const planEntries = useLiveQuery(() => db.planEntries.toArray())
  const blocks = useLiveQuery(() => db.blocks.toArray())

  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlanEntry | null>(null)

  if (!routines || !planEntries || !blocks) return null

  const block = getCurrentBlock(blocks)
  const focusLine = block?.weeklyFocusNotes[isoWeekString(today)]

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <Link to="/" className="text-sm font-medium text-accent">
          ‹ Today
        </Link>
      </div>
      <h1 className="px-4 pt-2 font-display text-3xl font-semibold">This week</h1>

      {focusLine && (
        <div className="mx-4 mt-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
          <p className="text-xs font-medium text-accent">This week's focus</p>
          <p className="mt-0.5 text-sm">{focusLine}</p>
        </div>
      )}

      {days.map((date) => {
        const weekday = weekdayMon0(date)
        const dayRoutines = routines.filter((r) => r.schedule.includes(weekday))
        const dayEntries = sortChecklist(entriesForDate(planEntries, date))
        const isToday = date === today

        return (
          <div key={date} className="border-t border-black/5 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <h3 className={`font-display text-base font-semibold ${isToday ? 'text-accent' : ''}`}>
                {WEEKDAY_NAMES[weekday]} <span className="font-body text-xs font-normal opacity-50">{date.slice(5)}</span>
              </h3>
              <button type="button" onClick={() => setAddingFor(date)} className="text-xs font-medium text-accent">
                + Add
              </button>
            </div>

            {dayRoutines.length === 0 && dayEntries.length === 0 ? (
              <p className="mt-1 text-xs opacity-50">Nothing scheduled.</p>
            ) : (
              <ul className="mt-1.5 space-y-1.5">
                {dayRoutines.map((r) => {
                  const done = routineChecks?.some((c) => c.routineId === r.id && c.date === date && c.done)
                  return (
                    <li key={r.id} className="flex items-center gap-2 text-sm">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${done ? 'bg-accent' : 'bg-black/20'}`} />
                      <span className={done ? 'opacity-50 line-through' : 'opacity-80'}>{r.name}</span>
                    </li>
                  )
                })}
                {dayEntries.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(e)}
                      className="flex w-full items-center gap-2 text-left text-sm"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      <span className="flex-1">{e.title}</span>
                      {e.time && <span className="shrink-0 text-xs tabular-nums opacity-50">{e.time}</span>}
                      {e.recurrence === 'weekly' && <span className="shrink-0 text-[10px] opacity-40">weekly</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {addingFor && <PlanEntryFormSheet defaultDate={addingFor} onClose={() => setAddingFor(null)} />}
      {editing && <PlanEntryFormSheet entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
