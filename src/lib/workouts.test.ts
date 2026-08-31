import { describe, expect, it } from 'vitest'
import type { LoggedSet, WorkoutSession } from '../db'
import { lastSetForExercise } from './workouts'

let seq = 0
function set(partial: Partial<LoggedSet> & { exerciseName: string }): LoggedSet {
  return {
    id: `s${seq++}`,
    exerciseId: partial.exerciseId ?? 'x',
    setIndex: partial.setIndex ?? 0,
    done: partial.done ?? true,
    ...partial,
  }
}

function session(date: string, createdAt: string, sets: LoggedSet[]): WorkoutSession {
  return { id: `w-${date}-${createdAt}`, date, createdAt, name: 'W', sets }
}

describe('lastSetForExercise ("copy last time")', () => {
  it('returns weight and reps from the top set of the most recent session with that exercise', () => {
    const sessions: WorkoutSession[] = [
      session('2026-08-01', '2026-08-01T10:00:00Z', [
        set({ exerciseName: 'Bench', setIndex: 0, weight: 50, reps: 8 }),
      ]),
      session('2026-08-10', '2026-08-10T10:00:00Z', [
        set({ exerciseName: 'Bench', setIndex: 0, weight: 60, reps: 8 }),
        set({ exerciseName: 'Bench', setIndex: 1, weight: 65, reps: 6 }),
        set({ exerciseName: 'Bench', setIndex: 2, weight: 62, reps: 6 }),
      ]),
      session('2026-08-05', '2026-08-05T10:00:00Z', [
        set({ exerciseName: 'Bench', setIndex: 0, weight: 55, reps: 8 }),
      ]),
    ]
    expect(lastSetForExercise(sessions, 'Bench')).toEqual({ weight: 65, reps: 6 })
  })

  it('breaks a same-day tie by createdAt', () => {
    const sessions: WorkoutSession[] = [
      session('2026-08-10', '2026-08-10T08:00:00Z', [set({ exerciseName: 'Row', weight: 40, reps: 10 })]),
      session('2026-08-10', '2026-08-10T20:00:00Z', [set({ exerciseName: 'Row', weight: 44, reps: 10 })]),
    ]
    expect(lastSetForExercise(sessions, 'Row')).toEqual({ weight: 44, reps: 10 })
  })

  it('matches the exercise name case-insensitively and ignores unrelated sessions', () => {
    const sessions: WorkoutSession[] = [
      session('2026-08-02', '2026-08-02T10:00:00Z', [set({ exerciseName: 'Squat', weight: 100, reps: 5 })]),
      session('2026-08-09', '2026-08-09T10:00:00Z', [set({ exerciseName: '  bench  ', weight: 70, reps: 5 })]),
    ]
    expect(lastSetForExercise(sessions, 'Bench')).toEqual({ weight: 70, reps: 5 })
  })

  it('returns null when the exercise has never been logged', () => {
    const sessions: WorkoutSession[] = [
      session('2026-08-02', '2026-08-02T10:00:00Z', [set({ exerciseName: 'Squat', weight: 100, reps: 5 })]),
    ]
    expect(lastSetForExercise(sessions, 'Deadlift')).toBeNull()
  })

  it('ignores sessions where the exercise has no weight or reps recorded', () => {
    const sessions: WorkoutSession[] = [
      session('2026-08-01', '2026-08-01T10:00:00Z', [set({ exerciseName: 'Curl', weight: 15, reps: 12 })]),
      session('2026-08-12', '2026-08-12T10:00:00Z', [set({ exerciseName: 'Curl', done: false })]),
    ]
    expect(lastSetForExercise(sessions, 'Curl')).toEqual({ weight: 15, reps: 12 })
  })
})
