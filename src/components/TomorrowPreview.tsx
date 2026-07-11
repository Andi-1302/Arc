import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addDays, todayISO, weekdayMon0 } from '../lib/date'
import { saveDayLog } from '../lib/actions'

export default function TomorrowPreview() {
  const tomorrow = addDays(todayISO(), 1)
  const tomorrowWeekday = weekdayMon0(tomorrow)

  const routines = useLiveQuery(
    () => db.routines.filter((r) => r.active && r.schedule.includes(tomorrowWeekday)).toArray(),
    [tomorrowWeekday],
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

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Tomorrow</h2>
      {routines && routines.length > 0 ? (
        <ul className="mt-1 text-sm opacity-70">
          {routines.map((r) => (
            <li key={r.id}>{r.name}</li>
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
