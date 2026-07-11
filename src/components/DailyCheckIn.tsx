import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import { todayISO } from '../lib/date'
import { saveDailyRating, saveDayLog } from '../lib/actions'

export default function DailyCheckIn() {
  const today = todayISO()
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))
  const dayLog = useLiveQuery(() => db.dayLogs.get(today), [today])

  const [note, setNote] = useState('')

  useEffect(() => {
    setNote(dayLog?.note ?? '')
  }, [dayLog?.note])

  if (!settings) return null

  const rating = dayLog?.rating

  async function handleRate(value: number) {
    await saveDailyRating(today, value)
  }

  async function handleNoteBlur() {
    if (note !== (dayLog?.note ?? '')) {
      await saveDayLog(today, { note: note || undefined })
    }
  }

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-lg font-semibold">{settings.dailyQuestion}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleRate(n)}
            className={`h-8 w-8 rounded-full text-sm font-medium ${
              rating === n ? 'bg-accent text-white' : 'bg-black/5 text-ink'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="One-line note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleNoteBlur}
        className="mt-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
    </div>
  )
}
