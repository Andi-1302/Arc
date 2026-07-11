import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todayISO } from '../lib/date'
import { computeRoutineStrength } from '../lib/strength'
import { getCurrentBlock, getPrioritizedGoalIds, getScoredRoutineIds } from '../lib/prioritized'
import BreakdownSheet from './BreakdownSheet'

export default function ScoreBadge() {
  const [open, setOpen] = useState(false)
  const today = todayISO()

  const routines = useLiveQuery(() => db.routines.toArray())
  const checks = useLiveQuery(() => db.routineChecks.toArray())
  const blocks = useLiveQuery(() => db.blocks.toArray())

  if (!routines || !checks || !blocks) return null

  const prioritizedGoalIds = getPrioritizedGoalIds(getCurrentBlock(blocks))
  const scoredIds = getScoredRoutineIds(routines, prioritizedGoalIds)
  const scoredRoutines = routines.filter((r) => scoredIds.includes(r.id))

  const strengths = scoredRoutines.map((r) => ({
    routine: r,
    value: computeRoutineStrength(
      r.schedule,
      checks.filter((c) => c.routineId === r.id),
      today,
    ),
  }))

  const overall = strengths.length === 0 ? 0 : strengths.reduce((sum, s) => sum + s.value, 0) / strengths.length
  const pct = Math.round(overall * 100)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Consistency score"
        className="flex items-center gap-2 rounded-full border border-ink/15 bg-surface px-2.5 py-1"
      >
        <span className="relative h-3 w-6 rounded-sm border border-ink/40">
          <span className="absolute inset-y-0 left-0 rounded-sm bg-accent" style={{ width: `${pct}%` }} />
        </span>
        <span className="font-display text-sm font-semibold tabular-nums">{pct}%</span>
      </button>
      {open && (
        <BreakdownSheet
          overall={overall}
          strengths={strengths}
          routines={routines}
          checks={checks}
          scoredRoutineIds={scoredIds}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
