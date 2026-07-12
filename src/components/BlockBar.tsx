import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { isoWeekString, todayISO } from '../lib/date'
import { getCurrentBlock } from '../lib/prioritized'
import { blockProgress, daysRemaining } from '../lib/block'

export default function BlockBar() {
  const blocks = useLiveQuery(() => db.blocks.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())

  if (!blocks || !goals) return null

  const block = getCurrentBlock(blocks)
  if (!block) {
    return (
      <div className="px-4 py-4">
        <p className="text-sm opacity-70">No active block. Start one in More → Cycles.</p>
      </div>
    )
  }

  const today = todayISO()
  const focusGoal = goals.find((g) => g.id === block.focusGoalId)
  const pct = Math.round(blockProgress(block, today) * 100)
  const remaining = daysRemaining(block, today)
  const ended = today > block.endDate
  const focusLine = block.weeklyFocusNotes[isoWeekString(today)]

  return (
    <div className="px-4 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">{block.name}</h2>
        <span className="text-xs opacity-60">{ended ? 'Block ended' : `${remaining} day${remaining === 1 ? '' : 's'} left`}</span>
      </div>
      {focusGoal && <p className="mt-0.5 text-sm font-medium text-accent">{focusGoal.name}</p>}
      <div className="relative mt-2.5 h-3 rounded-full bg-black/10">
        <div className="h-3 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        <div
          aria-hidden
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
      {focusLine && <p className="mt-2 text-sm opacity-70">This week: {focusLine}</p>}
      {ended && <p className="mt-2 text-xs font-medium text-warning">Close it out in More → Cycles.</p>}
    </div>
  )
}
