import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import { addDays, formatDayLabel, weekdayName } from '../lib/date'
import { useToday } from '../lib/useToday'
import BlockBar from '../components/BlockBar'
import BackupReminderBanner from '../components/BackupReminderBanner'
import Checklist from '../components/Checklist'
import TodayTodos from '../components/TodayTodos'
import DailyCheckIn from '../components/DailyCheckIn'
import TomorrowPreview from '../components/TomorrowPreview'
import WeeklyReviewPrompt from '../components/WeeklyReviewPrompt'

const DEFAULT_DAY_CUTOFF_HOUR = 4

export default function Today() {
  const today = useToday()
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))
  const [selectedDate, setSelectedDate] = useState(today)
  const [lateBannerDismissed, setLateBannerDismissed] = useState(false)

  const isToday = selectedDate === today
  const isPast = selectedDate < today
  const prevDay = addDays(today, -1)

  const cutoffHour = settings?.dayCutoffHour ?? DEFAULT_DAY_CUTOFF_HOUR
  // null = no rating logged for yesterday; undefined = still loading; number = already checked in.
  const prevDayRating = useLiveQuery(
    () => db.dayLogs.get(prevDay).then((log) => log?.rating ?? null),
    [prevDay],
  )
  const inLateWindow = new Date().getHours() < cutoffHour
  const showLateBanner = isToday && inLateWindow && !lateBannerDismissed && prevDayRating === null

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-lg leading-none"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold tabular-nums">{formatDayLabel(selectedDate)}</span>
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-full border border-ink/15 px-2 py-0.5 text-xs font-medium text-accent"
            >
              Today
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Next day"
          disabled={isToday}
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-lg leading-none disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {isPast && (
        <div className="bg-warning/15 px-4 py-2 text-center text-sm font-semibold text-warning">
          Filling in {formatDayLabel(selectedDate)}
        </div>
      )}

      {showLateBanner && (
        <div className="flex items-center gap-2 border-t border-black/5 bg-accent/10 px-4 py-2 text-sm">
          <button
            type="button"
            onClick={() => setSelectedDate(prevDay)}
            className="flex-1 text-left font-medium text-accent"
          >
            Still up? You haven't checked in for {weekdayName(prevDay)}.
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setLateBannerDismissed(true)}
            className="shrink-0 px-1 text-lg leading-none opacity-50"
          >
            ×
          </button>
        </div>
      )}

      <BlockBar />
      <BackupReminderBanner />
      {!settings?.hideRoutineChecklist && (
        <div className="border-t border-black/5">
          <Checklist date={selectedDate} />
        </div>
      )}
      <div className="border-t border-black/5">
        <TodayTodos date={selectedDate} />
      </div>
      <div className="border-t border-black/5">
        <DailyCheckIn date={selectedDate} />
      </div>
      <div className="border-t border-black/5">
        <TomorrowPreview date={selectedDate} />
      </div>
      <div className="border-t border-black/5">
        <WeeklyReviewPrompt />
      </div>
    </div>
  )
}
