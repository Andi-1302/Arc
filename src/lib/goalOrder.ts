import type { Block, Goal } from '../db'

export type PriorityTier = 'focus' | 'secondary' | 'other' | 'paused'

const TIER_ORDER: PriorityTier[] = ['focus', 'secondary', 'other', 'paused']

export const TIER_LABEL: Partial<Record<PriorityTier, string>> = {
  focus: 'Focus',
  secondary: 'Secondary',
}

/** Priority & graying (spec §4.1). */
export function goalTier(goal: Goal, block: Block | undefined): PriorityTier {
  if (goal.status === 'paused') return 'paused'
  if (block?.focusGoalId === goal.id) return 'focus'
  if (block?.secondaryGoalIds.includes(goal.id)) return 'secondary'
  return 'other'
}

export function sortGoals(goals: Goal[], block: Block | undefined): Goal[] {
  return [...goals].sort((a, b) => {
    const diff = TIER_ORDER.indexOf(goalTier(a, block)) - TIER_ORDER.indexOf(goalTier(b, block))
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })
}
