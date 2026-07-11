import type { Block, Routine } from '../db'

export function getCurrentBlock(blocks: Block[]): Block | undefined {
  const open = blocks.filter((b) => !b.closedAt)
  if (open.length === 0) return undefined
  return open.reduce((latest, b) => (b.startDate > latest.startDate ? b : latest))
}

export function getPrioritizedGoalIds(block: Block | undefined): string[] {
  if (!block) return []
  return [block.focusGoalId, ...block.secondaryGoalIds]
}

/** Active routines linked to a prioritized goal, or global (no goalIds) — spec §4.4/§6. */
export function getScoredRoutineIds(routines: Routine[], prioritizedGoalIds: string[]): string[] {
  return routines
    .filter((r) => r.active)
    .filter((r) => r.goalIds.length === 0 || r.goalIds.some((g) => prioritizedGoalIds.includes(g)))
    .map((r) => r.id)
}
