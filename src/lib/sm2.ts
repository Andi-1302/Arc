import { addDays, todayISO } from './date'

const MIN_EASE = 1.3
const FUZZ_THRESHOLD_DAYS = 3
const FUZZ_RANGE = 0.05

export interface Sm2State {
  ease: number
  intervalDays: number
  reps: number
}

export interface Sm2Result extends Sm2State {
  dueDate: string
}

/** SM-2 grading, fixed parameters per spec §7. Grades: 0 Forgot, 1 Hard, 2 Good, 3 Easy. */
export function applyGrade(card: Sm2State, grade: 0 | 1 | 2 | 3): Sm2Result {
  let { ease, intervalDays, reps } = card

  if (grade === 0) {
    reps = 0
    intervalDays = 0
    ease = Math.max(MIN_EASE, ease - 0.2)
  } else if (grade === 1) {
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2))
    ease = Math.max(MIN_EASE, ease - 0.15)
  } else {
    reps += 1
    if (reps === 1) intervalDays = 1
    else if (reps === 2) intervalDays = 3
    else intervalDays = Math.round(intervalDays * ease)

    if (grade === 3) {
      intervalDays = Math.round(intervalDays * 1.3)
      ease = ease + 0.15
    }
  }

  if (intervalDays >= FUZZ_THRESHOLD_DAYS) {
    const fuzz = 1 + (Math.random() * 2 - 1) * FUZZ_RANGE
    intervalDays = Math.max(1, Math.round(intervalDays * fuzz))
  }

  return { ease, intervalDays, reps, dueDate: addDays(todayISO(), intervalDays) }
}
