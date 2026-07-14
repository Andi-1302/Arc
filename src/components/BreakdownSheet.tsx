import { createPortal } from 'react-dom'
import type { Routine, RoutineCheck } from '../db'
import { todayISO } from '../lib/date'
import { computeWeeklyQuota, type CardsScheduleToday } from '../lib/quota'

interface StrengthRow {
  routine: Routine
  value: number
}

export default function BreakdownSheet({
  overall,
  strengths,
  routines,
  checks,
  scoredRoutineIds,
  cardsToday,
  onClose,
}: {
  overall: number
  strengths: StrengthRow[]
  routines: Routine[]
  checks: RoutineCheck[]
  scoredRoutineIds: string[]
  cardsToday: CardsScheduleToday
  onClose: () => void
}) {
  const quota = computeWeeklyQuota(routines, checks, scoredRoutineIds, todayISO(), cardsToday)

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-xl font-semibold">Consistency</h3>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-black/10 p-3">
            <p className="font-display text-2xl font-semibold tabular-nums">{Math.round(overall * 100)}%</p>
            <p className="mt-0.5 text-xs font-medium">Overall score</p>
            <p className="mt-1 text-xs opacity-60">
              A slow, multi-day average. New or missed routines start near 0% and climb gradually — it won't
              jump to match the quota.
            </p>
          </div>
          <div className="rounded-lg border border-black/10 p-3">
            <p className="font-display text-2xl font-semibold tabular-nums">
              {quota.scheduled > 0 ? `${Math.round(quota.ratio * 100)}%` : '—'}
            </p>
            <p className="mt-0.5 text-xs font-medium">This week's quota</p>
            <p className="mt-1 text-xs opacity-60">
              {quota.completed}/{quota.scheduled} completed vs. scheduled — resets every week, moves fast.
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs opacity-50">
          These measure different timeframes, so a low overall score next to a high quota (or the reverse)
          isn't a bug.
        </p>

        <ul className="mt-4 space-y-2">
          {strengths.map(({ routine, value }) => (
            <li key={routine.id}>
              <div className="flex justify-between text-sm">
                <span>{routine.name}</span>
                <span className="tabular-nums opacity-70">{Math.round(value * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-black/10">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs opacity-60">
          Each scheduled day nudges a routine's strength 5% toward done or missed — consistency compounds, and
          missing one day after a long run only costs about 5%, not everything.
        </p>

        <button type="button" onClick={onClose} className="mt-4 w-full rounded-lg border border-black/10 py-2 text-sm">
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
