import type { Block, Routine } from '../db'
import { daysBetween } from './date'

/** 0..1 progress of today through the block's date range. */
export function blockProgress(block: Block, today: string): number {
  if (today <= block.startDate) return 0
  if (today >= block.endDate) return 1
  const total = daysBetween(block.startDate, block.endDate)
  return total === 0 ? 1 : daysBetween(block.startDate, today) / total
}

export function daysRemaining(block: Block, today: string): number {
  return Math.max(0, daysBetween(today, block.endDate))
}

/** Spec §4.2: routines that would lose all prioritized anchoring if the goal set changes to nextPrioritizedGoalIds. */
export function routinesLosingPriority(
  prevPrioritizedGoalIds: string[],
  nextPrioritizedGoalIds: string[],
  routines: Routine[],
): Routine[] {
  const losingGoalIds = prevPrioritizedGoalIds.filter((id) => !nextPrioritizedGoalIds.includes(id))
  if (losingGoalIds.length === 0) return []
  return routines.filter(
    (r) =>
      r.active &&
      r.goalIds.some((g) => losingGoalIds.includes(g)) &&
      !r.goalIds.some((g) => nextPrioritizedGoalIds.includes(g)),
  )
}
