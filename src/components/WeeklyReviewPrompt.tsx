import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { isoWeekString, todayISO, weekdayMon0 } from '../lib/date'
import WeeklyReviewFlow from './WeeklyReviewFlow'

export default function WeeklyReviewPrompt() {
  const today = todayISO()
  const isSunday = weekdayMon0(today) === 6
  const week = isoWeekString(today)
  const [open, setOpen] = useState(false)

  const existingReview = useLiveQuery(() => db.reviews.where('isoWeek').equals(week).first(), [week])

  if (!isSunday || existingReview) return null

  return (
    <div className="px-4 py-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-accent bg-accent/5 px-4 py-3 text-left"
      >
        <span className="font-display text-lg font-semibold text-accent">Do your weekly review</span>
        <span className="mt-0.5 block text-sm opacity-70">Quota, key metrics, reflection, plan next week.</span>
      </button>
      {open && <WeeklyReviewFlow week={week} onClose={() => setOpen(false)} />}
    </div>
  )
}
