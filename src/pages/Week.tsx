import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area, type PlanEntry, type Routine } from '../db'
import { addDays, isoWeekString, startOfIsoWeek, weekdayMon0 } from '../lib/date'
import { useToday } from '../lib/useToday'
import { entriesForDate, layoutTimed, minutesToTime } from '../lib/planEntries'
import { getCurrentBlock } from '../lib/prioritized'
import { hexToRgba } from '../lib/color'
import PlanEntryFormSheet from '../components/PlanEntryFormSheet'
import { throwIfDevCrashRequested } from '../lib/devCrash'

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const RANGE_START = 6 * 60 // 06:00
const RANGE_END = 22 * 60 // 22:00
const HOUR_PX = 48
const GRID_HEIGHT = ((RANGE_END - RANGE_START) / 60) * HOUR_PX
const HOURS = Array.from({ length: (RANGE_END - RANGE_START) / 60 }, (_, i) => RANGE_START / 60 + i)

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export default function Week() {
  throwIfDevCrashRequested('week')
  const today = useToday()
  const weekStart = startOfIsoWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const routines = useLiveQuery(() => db.routines.filter((r) => r.active).toArray())
  const planEntries = useLiveQuery(() => db.planEntries.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const areas = useLiveQuery(() => db.areas.toArray())
  const blocks = useLiveQuery(() => db.blocks.toArray())

  const [addingAt, setAddingAt] = useState<{ date: string; time: string } | null>(null)
  const [editing, setEditing] = useState<PlanEntry | null>(null)
  const nowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  if (!routines || !planEntries || !goals || !areas || !blocks) return null

  const block = getCurrentBlock(blocks)
  const focusLine = block?.weeklyFocusNotes[isoWeekString(today)]

  function areaForRoutine(routine: Routine): Area | undefined {
    const goalId = routine.goalIds[0]
    const goal = goalId ? goals!.find((g) => g.id === goalId) : undefined
    return goal ? areas!.find((a) => a.id === goal.areaId) : undefined
  }

  function areaForEntry(entry: PlanEntry): Area | undefined {
    return entry.areaId ? areas!.find((a) => a.id === entry.areaId) : undefined
  }

  const nowTop = Math.max(0, Math.min(RANGE_END, nowMinutes()) - RANGE_START) * (HOUR_PX / 60)

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <h1 className="font-display text-3xl font-semibold">Week</h1>
        {focusLine && (
          <div className="mt-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
            <p className="text-xs font-medium text-accent">This week's focus</p>
            <p className="mt-0.5 text-sm">{focusLine}</p>
          </div>
        )}
      </div>

      {/* Day header */}
      <div className="mt-3 grid grid-cols-[24px_repeat(7,1fr)] gap-px px-2 text-center">
        <span />
        {days.map((date, i) => (
          <div key={date} className={`min-w-0 ${date === today ? 'text-accent' : ''}`}>
            <p className="text-[11px] font-semibold">{WEEKDAY_SHORT[i]}</p>
            <p className="text-[9px] opacity-50">{date.slice(5)}</p>
          </div>
        ))}
      </div>

      {/* All-day strip: routines (read-only) + untimed plan entries */}
      <div className="mt-1.5 grid grid-cols-[24px_repeat(7,1fr)] gap-px border-b border-black/10 px-2 pb-2">
        <span />
        {days.map((date) => {
          const weekday = weekdayMon0(date)
          const dayRoutines = routines.filter((r) => r.schedule.includes(weekday))
          const untimedEntries = entriesForDate(planEntries, date).filter((e) => !e.time)
          return (
            <div key={date} className="flex min-w-0 flex-col gap-0.5 px-0.5">
              {dayRoutines.map((r) => {
                const area = areaForRoutine(r)
                return (
                  <span
                    key={r.id}
                    className="truncate rounded-sm px-1 py-0.5 text-[9px] leading-tight"
                    style={{
                      backgroundColor: area ? hexToRgba(area.color, 0.15) : 'rgba(0,0,0,0.05)',
                      borderLeft: `2px solid ${area ? area.color : 'transparent'}`,
                    }}
                    title={r.name}
                  >
                    {r.name}
                  </span>
                )
              })}
              {untimedEntries.map((e) => {
                const area = areaForEntry(e)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEditing(e)}
                    className="truncate rounded-sm px-1 py-0.5 text-left text-[9px] leading-tight"
                    style={{
                      backgroundColor: area ? hexToRgba(area.color, 0.18) : 'rgba(31,79,224,0.1)',
                      borderLeft: `2px solid ${area ? area.color : 'var(--color-accent)'}`,
                    }}
                    title={e.title}
                  >
                    {e.title}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Hour grid */}
      <div
        className="relative mt-1 grid grid-cols-[24px_repeat(7,1fr)] px-2"
        style={{
          height: GRID_HEIGHT,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${HOUR_PX - 1}px, rgba(0,0,0,0.06) ${HOUR_PX - 1}px, rgba(0,0,0,0.06) ${HOUR_PX}px)`,
        }}
      >
        <div className="relative">
          {HOURS.map((h) => (
            <span key={h} className="absolute text-[9px] opacity-40" style={{ top: (h - RANGE_START / 60) * HOUR_PX + 2 }}>
              {h}
            </span>
          ))}
        </div>

        {days.map((date) => {
          const timed = layoutTimed(entriesForDate(planEntries, date))
          const isToday = date === today

          return (
            <div
              key={date}
              className="relative min-w-0 border-l border-black/5"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const snapped = Math.round(((y / HOUR_PX) * 60) / 30) * 30
                setAddingAt({ date, time: minutesToTime(RANGE_START + snapped) })
              }}
            >
              {isToday && (
                <div ref={nowRef} className="pointer-events-none absolute inset-x-0 z-10 border-t border-warning" style={{ top: nowTop }} />
              )}
              {timed.map(({ item, startMin, endMin, col, cols }) => {
                const area = areaForEntry(item)
                const top = (Math.max(RANGE_START, startMin) - RANGE_START) * (HOUR_PX / 60)
                const height = Math.max(
                  16,
                  (Math.min(RANGE_END, endMin) - Math.max(RANGE_START, startMin)) * (HOUR_PX / 60),
                )
                const width = 100 / cols
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(item)
                    }}
                    className="absolute overflow-hidden rounded-sm px-1 py-0.5 text-left leading-tight"
                    style={{
                      top,
                      height,
                      left: `${col * width}%`,
                      width: `calc(${width}% - 2px)`,
                      backgroundColor: area ? hexToRgba(area.color, 0.2) : 'rgba(31,79,224,0.12)',
                      borderLeft: `2px solid ${area ? area.color : 'var(--color-accent)'}`,
                    }}
                  >
                    <span className="block truncate text-[9px] font-medium">{item.title}</span>
                    <span className="block truncate text-[8px] opacity-60">{item.time}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {addingAt && (
        <PlanEntryFormSheet defaultDate={addingAt.date} defaultTime={addingAt.time} onClose={() => setAddingAt(null)} />
      )}
      {editing && <PlanEntryFormSheet entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
