import { db, SETTINGS_ID, type Goal, type Metric, type Module, type Routine, type Settings } from '../db'
import { todayISO } from './date'
import { routinesLosingPriority } from './block'

const uid = () => crypto.randomUUID()

export async function toggleRoutineCheck(routineId: string, date: string) {
  const existing = await db.routineChecks.where('[routineId+date]').equals([routineId, date]).first()
  if (existing) {
    await db.routineChecks.update(existing.id, { done: !existing.done })
  } else {
    await db.routineChecks.add({ id: uid(), routineId, date, done: true })
  }
}

export async function addMetricEntry(metricId: string, date: string, value: number, note?: string) {
  await db.entries.add({ id: uid(), metricId, date, value, note })
}

export async function updateMetricEntry(id: string, patch: { date: string; value: number; note?: string }) {
  await db.entries.update(id, patch)
}

export async function deleteMetricEntry(id: string) {
  await db.entries.delete(id)
}

export async function createArea(patch: { name: string; color: string; image?: string }) {
  const id = uid()
  const count = await db.areas.count()
  await db.areas.add({ id, sortOrder: count, ...patch })
  return id
}

export async function updateArea(id: string, patch: { name: string; color: string; image?: string }) {
  await db.areas.update(id, patch)
}

export async function deleteArea(id: string) {
  await db.areas.delete(id)
}

export async function createGoal(input: {
  areaId: string
  name: string
  description?: string
  coverImage?: string
  modules: Module[]
}) {
  const id = uid()
  const goal: Goal = { id, status: 'active', createdAt: new Date().toISOString(), ...input }
  await db.goals.add(goal)
  return id
}

export async function updateGoal(
  id: string,
  patch: { name: string; description?: string; coverImage?: string; modules: Module[] },
) {
  await db.goals.update(id, patch)
}

export async function archiveGoal(id: string) {
  await db.goals.update(id, { status: 'archived' })
}

export async function restoreGoal(id: string) {
  await db.goals.update(id, { status: 'active' })
}

/** Hard delete (spec §4.1: nothing is deleted except via explicit archive → delete). Cascades to the goal's own records. */
export async function deleteGoalPermanently(goalId: string) {
  const metricIds = (await db.metrics.where('goalId').equals(goalId).toArray()).map((m) => m.id)
  if (metricIds.length > 0) await db.entries.where('metricId').anyOf(metricIds).delete()
  await db.metrics.where('goalId').equals(goalId).delete()
  await db.milestones.where('goalId').equals(goalId).delete()
  await db.resources.where('goalId').equals(goalId).delete()
  const cardIds = (await db.cards.where('goalId').equals(goalId).toArray()).map((c) => c.id)
  if (cardIds.length > 0) await db.cardReviews.where('cardId').anyOf(cardIds).delete()
  await db.cards.where('goalId').equals(goalId).delete()
  await db.photos.where('goalId').equals(goalId).delete()

  const linkedRoutines = await db.routines.where('goalIds').equals(goalId).toArray()
  for (const routine of linkedRoutines) {
    await db.routines.update(routine.id, { goalIds: routine.goalIds.filter((g) => g !== goalId) })
  }

  await db.goals.delete(goalId)
}

export async function createMetric(input: Omit<Metric, 'id'>) {
  const id = uid()
  await db.metrics.add({ id, ...input })
  return id
}

export async function addMilestone(goalId: string, title: string) {
  const sortOrder = await db.milestones.where('goalId').equals(goalId).count()
  await db.milestones.add({ id: uid(), goalId, title, done: false, sortOrder })
}

export async function toggleMilestone(id: string, done: boolean) {
  await db.milestones.update(id, { done, doneAt: done ? todayISO() : undefined })
}

export async function deleteMilestone(id: string) {
  await db.milestones.delete(id)
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>) {
  await db.settings.update(SETTINGS_ID, patch)
}

interface BlockPriorities {
  name: string
  startDate: string
  endDate: string
  focusGoalId: string
  secondaryGoalIds: string[]
}

export async function createBlock(input: BlockPriorities) {
  await db.blocks.add({ id: uid(), weeklyFocusNotes: {}, ...input })
}

export async function updateBlockPriorities(id: string, patch: BlockPriorities) {
  await db.blocks.update(id, { ...patch })
}

export async function closeBlock(id: string, reflection: string) {
  await db.blocks.update(id, { closedAt: new Date().toISOString(), reflection })
}

export async function pauseRoutines(ids: string[]) {
  for (const id of ids) await db.routines.update(id, { active: false })
}

/** Spec §4.2: ask once whether to pause routines for goals that just lost priority. */
export async function confirmAndPauseRoutines(
  prevPrioritizedGoalIds: string[],
  nextPrioritizedGoalIds: string[],
  routines: Routine[],
) {
  const toPause = routinesLosingPriority(prevPrioritizedGoalIds, nextPrioritizedGoalIds, routines)
  if (toPause.length === 0) return
  const names = toPause.map((r) => r.name).join(', ')
  if (window.confirm(`These goals lost priority. Pause their routines?\n${names}`)) {
    await pauseRoutines(toPause.map((r) => r.id))
  }
}

export async function updateRoutineSchedule(id: string, schedule: number[]) {
  await db.routines.update(id, { schedule })
}

interface RoutinePatch {
  name: string
  goalIds: string[]
  schedule: number[]
  quickMetricIds: string[]
}

export async function createRoutine(input: RoutinePatch) {
  await db.routines.add({ id: uid(), active: true, ...input })
}

export async function updateRoutine(id: string, patch: RoutinePatch) {
  await db.routines.update(id, { ...patch })
}

export async function setRoutineActive(id: string, active: boolean) {
  await db.routines.update(id, { active })
}

export async function deleteRoutine(id: string) {
  await db.routineChecks.where('routineId').equals(id).delete()
  await db.strengths.delete(id)
  await db.routines.delete(id)
}

export async function setBlockWeekFocus(blockId: string, isoWeek: string, note: string) {
  const block = await db.blocks.get(blockId)
  if (!block) return
  await db.blocks.update(blockId, { weeklyFocusNotes: { ...block.weeklyFocusNotes, [isoWeek]: note } })
}

export async function createWeeklyReview(input: {
  isoWeek: string
  processQuota: number
  note: string
  nextWeekFocus?: string
}) {
  await db.reviews.add({ id: uid(), createdAt: new Date().toISOString(), ...input })
}

export async function saveDayLog(
  date: string,
  patch: { rating?: number; note?: string; tomorrowFocus?: string; gratitude?: string[] },
) {
  const existing = await db.dayLogs.get(date)
  if (existing) {
    await db.dayLogs.update(date, patch)
  } else {
    await db.dayLogs.add({ date, ...patch })
  }
}

export async function saveDailyRating(date: string, rating: number) {
  await saveDayLog(date, { rating })

  // goalId: null isn't a valid IndexedDB key, so this can't use the goalId index — filter the table instead.
  const metric = await db.metrics.filter((m) => m.goalId === null && m.name === 'Daily rating').first()
  if (!metric) return

  const existingEntry = await db.entries.where('[metricId+date]').equals([metric.id, date]).first()
  if (existingEntry) {
    await db.entries.update(existingEntry.id, { value: rating })
  } else {
    await db.entries.add({ id: uid(), metricId: metric.id, date, value: rating })
  }
}
