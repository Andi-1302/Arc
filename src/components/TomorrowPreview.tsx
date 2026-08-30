import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addDays, weekdayMon0 } from '../lib/date'
import { entriesForDate, sortChecklist } from '../lib/planEntries'
import { saveDayLog } from '../lib/actions'

export default function TomorrowPreview({ date }: { date: string }) {
  // Follows the Today navigator's selected day: the "tomorrow" being previewed is the day after it.
  const tomorrow = addDays(date, 1)
  const tomorrowWeekday = weekdayMon0(tomorrow)

  const routines = useLiveQuery(
    () => db.routines.filter((r) => r.active && r.schedule.includes(tomorrowWeekday)).toArray(),
    [tomorrowWeekday],
  )
  const planEntries = useLiveQuery(
    () => db.planEntries.toArray().then((all) => entriesForDate(all, tomorrow)),
    [tomorrow],
  )
  const dayLog = useLiveQuery(() => db.dayLogs.get(tomorrow), [tomorrow])

  const [focus, setFocus] = useState('')

  useEffect(() => {
    setFocus(dayLog?.tomorrowFocus ?? '')
  }, [dayLog?.tomorrowFocus])

  async function handleBlur() {
    if (focus !== (dayLog?.tomorrowFocus ?? '')) {
      await saveDayLog(tomorrow, { tomorrowFocus: focus || undefined })
    }
  }

  const items = sortChecklist([
    ...(routines ?? []).map((r) => ({ key: `r-${r.id}`, title: r.name, time: undefined as string | undefined })),
    ...(planEntries ?? []).map((e) => ({ key: `p-${e.id}`, title: e.title, time: e.time })),
  ])

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Tomorrow</h2>
      {items.length > 0 ? (
        <ul className="mt-1 text-sm opacity-70">
          {items.map((item) => (
            <li key={item.key}>
              {item.title}
              {item.time && <span className="ml-1.5 tabular-nums opacity-70">{item.time}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm opacity-70">Nothing scheduled.</p>
      )}
      <input
        type="text"
        placeholder="Tomorrow's focus (optional)"
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        onBlur={handleBlur}
        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
    </div>
  )
}
