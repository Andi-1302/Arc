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
  const [gratitude, setGratitude] = useState(['', '', ''])
  const [gratitudeOpen, setGratitudeOpen] = useState(false)

  useEffect(() => {
    setNote(dayLog?.note ?? '')
  }, [dayLog?.note])

  useEffect(() => {
    const g = dayLog?.gratitude ?? []
    setGratitude([g[0] ?? '', g[1] ?? '', g[2] ?? ''])
    if (g.some((x) => x)) setGratitudeOpen(true)
  }, [dayLog?.gratitude])

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

  async function handleGratitudeBlur() {
    const trimmed = gratitude.map((g) => g.trim())
    const stored = dayLog?.gratitude ?? []
    const changed = trimmed.some((g, i) => g !== (stored[i] ?? ''))
    if (!changed) return
    const nonEmpty = trimmed.filter(Boolean)
    await saveDayLog(today, { gratitude: nonEmpty.length > 0 ? trimmed : undefined })
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
      <textarea
        placeholder="Notes (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleNoteBlur}
        rows={2}
        className="mt-3 w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => setGratitudeOpen((o) => !o)}
        className="mt-3 text-sm font-medium text-accent"
      >
        {gratitudeOpen ? '− ' : '+ '}3 things I'm grateful for
      </button>
      {gratitudeOpen && (
        <div className="mt-2 space-y-2">
          {gratitude.map((value, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Grateful for #${i + 1}`}
              value={value}
              onChange={(e) => setGratitude((arr) => arr.map((v, idx) => (idx === i ? e.target.value : v)))}
              onBlur={handleGratitudeBlur}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          ))}
        </div>
      )}
    </div>
  )
}
