import { useNavigate } from 'react-router-dom'
import { addDays, startOfIsoWeek, todayISO, WEEKDAY_LABELS } from '../lib/date'

export default function WeekStrip() {
  const navigate = useNavigate()
  const today = todayISO()
  const weekStart = startOfIsoWeek(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <button
      type="button"
      onClick={() => navigate('/week')}
      className="flex w-full items-center justify-between border-t border-black/5 px-4 py-3"
    >
      <div className="flex gap-1.5">
        {days.map((d, i) => (
          <span
            key={d}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
              d === today ? 'bg-accent text-white' : 'text-ink/50'
            }`}
          >
            {WEEKDAY_LABELS[i]}
          </span>
        ))}
      </div>
      <span className="text-sm font-medium text-accent">This week ›</span>
    </button>
  )
}
