import type { LoggedSet, TemplateExercise, WorkoutSession } from '../db'
import { startOfIsoWeek } from './date'
import { imbalancePercent } from './metrics'

const norm = (name: string) => name.trim().toLowerCase()
const n = (x: number | undefined) => x ?? 0

/** Sessions that logged a given exercise (matched by name), oldest first. */
export function sessionsWithExercise(sessions: WorkoutSession[], exerciseName: string): WorkoutSession[] {
  const key = norm(exerciseName)
  return sessions
    .filter((s) => s.sets.some((set) => norm(set.exerciseName) === key))
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
}

function setsFor(session: WorkoutSession, exerciseName: string): LoggedSet[] {
  const key = norm(exerciseName)
  return session.sets.filter((set) => norm(set.exerciseName) === key)
}

/**
 * "Copy last time": the weight and reps to prefill for an exercise, taken from the
 * top set (heaviest, then latest) of the most recent session that logged it.
 * Returns null when the exercise has never been logged.
 */
export function lastSetForExercise(
  sessions: WorkoutSession[],
  exerciseName: string,
): { weight?: number; reps?: number } | null {
  const withIt = sessionsWithExercise(sessions, exerciseName).filter((s) =>
    setsFor(s, exerciseName).some((set) => set.weight !== undefined || set.reps !== undefined),
  )
  const latest = withIt[withIt.length - 1]
  if (!latest) return null

  const candidates = setsFor(latest, exerciseName).filter((set) => set.weight !== undefined || set.reps !== undefined)
  const top = candidates.reduce((best, set) =>
    n(set.weight) > n(best.weight) || (n(set.weight) === n(best.weight) && set.setIndex >= best.setIndex) ? set : best,
  )
  return { weight: top.weight, reps: top.reps }
}

/** Whether an exercise was logged with distinct left/right sides in any session. */
export function isPerSideExercise(sessions: WorkoutSession[], exerciseName: string): boolean {
  return sessionsWithExercise(sessions, exerciseName).some((s) =>
    setsFor(s, exerciseName).some((set) => set.side === 'left' || set.side === 'right'),
  )
}

export interface ExercisePoint {
  date: string
  week: string
  topWeight: number
  volume: number
  /** imbalance % between the top left-side and top right-side set; 0 when not per-side */
  sideGap: number
}

/** One point per session that logged the exercise: top-set weight, total volume, and side gap. */
export function exerciseSeries(sessions: WorkoutSession[], exerciseName: string): ExercisePoint[] {
  return sessionsWithExercise(sessions, exerciseName).map((session) => {
    const sets = setsFor(session, exerciseName)
    const topWeight = sets.reduce((max, set) => Math.max(max, n(set.weight)), 0)
    const volume = sets.reduce((sum, set) => sum + n(set.weight) * n(set.reps), 0)
    const leftTop = sets.filter((s) => s.side === 'left').reduce((m, s) => Math.max(m, n(s.weight)), 0)
    const rightTop = sets.filter((s) => s.side === 'right').reduce((m, s) => Math.max(m, n(s.weight)), 0)
    const sideGap = leftTop === 0 && rightTop === 0 ? 0 : imbalancePercent(leftTop, rightTop)
    return { date: session.date, week: startOfIsoWeek(session.date), topWeight, volume, sideGap }
  })
}

/** Total weekly volume (Σ weight × reps) for an exercise. */
export function exerciseWeeklyVolume(sessions: WorkoutSession[], exerciseName: string): { week: string; volume: number }[] {
  const byWeek = new Map<string, number>()
  for (const point of exerciseSeries(sessions, exerciseName)) {
    byWeek.set(point.week, (byWeek.get(point.week) ?? 0) + point.volume)
  }
  return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, volume]) => ({ week, volume }))
}

/** Distinct exercise names logged for a goal, in first-seen order. */
export function exerciseNamesForGoal(sessions: WorkoutSession[], goalId: string): string[] {
  const seen = new Map<string, string>()
  for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    if (session.goalId !== goalId) continue
    for (const set of session.sets) {
      const key = norm(set.exerciseName)
      if (!seen.has(key)) seen.set(key, set.exerciseName)
    }
  }
  return [...seen.values()]
}

/** One-line human summary of a logged session, e.g. "Bench · 3×8 · 60 kg  +  Row · 3×10". */
export function sessionSummary(session: WorkoutSession): string {
  const byExercise = new Map<string, LoggedSet[]>()
  for (const set of session.sets) {
    const list = byExercise.get(set.exerciseName) ?? []
    list.push(set)
    byExercise.set(set.exerciseName, list)
  }
  return [...byExercise.entries()].map(([name, sets]) => exerciseLine(name, sets)).join('  +  ')
}

/** e.g. "Bench · 3×8 · 60 kg" — done set count, modal reps, heaviest weight. */
export function exerciseLine(name: string, sets: LoggedSet[]): string {
  const doneCount = sets.filter((s) => s.done).length || sets.length
  const reps = sets.map((s) => s.reps).filter((r): r is number => r !== undefined)
  const weights = sets.map((s) => s.weight).filter((w): w is number => w !== undefined)
  const parts = [name]
  if (reps.length > 0) parts.push(`${doneCount}×${mode(reps)}`)
  else parts.push(`${doneCount} set${doneCount === 1 ? '' : 's'}`)
  if (weights.length > 0) parts.push(`${Math.max(...weights)} kg`)
  return parts.join(' · ')
}

function mode(nums: number[]): number {
  const counts = new Map<number, number>()
  let best = nums[0]
  let bestCount = 0
  for (const num of nums) {
    const c = (counts.get(num) ?? 0) + 1
    counts.set(num, c)
    if (c > bestCount) {
      best = num
      bestCount = c
    }
  }
  return best
}

/** Build the initial set rows for the logger from a template exercise. */
export function seedSetsForExercise(exercise: TemplateExercise): {
  setIndex: number
  side?: 'left' | 'right' | 'both'
  weight?: number
  reps?: number
}[] {
  const rows: { setIndex: number; side?: 'left' | 'right' | 'both'; weight?: number; reps?: number }[] = []
  const total = Math.max(1, exercise.targetSets)
  for (let i = 0; i < total; i++) {
    const base = { setIndex: i, weight: exercise.targetWeight, reps: exercise.targetReps }
    if (exercise.perSide) {
      rows.push({ ...base, side: 'left' }, { ...base, side: 'right' })
    } else {
      rows.push({ ...base, side: 'both' })
    }
  }
  return rows
}
