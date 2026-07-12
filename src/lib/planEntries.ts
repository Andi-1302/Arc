import type { PlanEntry } from '../db'
import { weekdayMon0 } from './date'

export function entriesForDate(entries: PlanEntry[], date: string): PlanEntry[] {
  const weekday = weekdayMon0(date)
  return entries.filter((e) => (e.recurrence === 'once' ? e.date === date : e.weekday === weekday))
}

/** Timed items first (ascending), then untimed items, alphabetical within each group. */
export function sortChecklist<T extends { title: string; time?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const t = (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
    return t !== 0 ? t : a.title.localeCompare(b.title)
  })
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, min))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface TimedLayout<T> {
  item: T
  startMin: number
  endMin: number
  col: number
  cols: number
}

/** Positions timed items on a day's timetable, splitting overlapping items into side-by-side columns. */
export function layoutTimed<T extends { time?: string; durationMin?: number }>(items: T[]): TimedLayout<T>[] {
  const timed = items
    .filter((i): i is T & { time: string } => Boolean(i.time))
    .map((i) => ({
      item: i,
      startMin: timeToMinutes(i.time),
      endMin: timeToMinutes(i.time) + (i.durationMin ?? 60),
    }))
    .sort((a, b) => a.startMin - b.startMin)

  const result: TimedLayout<T>[] = []
  let cluster: typeof timed = []
  let clusterEnd = -1

  function flush() {
    cluster.forEach((c, idx) => result.push({ ...c, col: idx, cols: cluster.length }))
    cluster = []
  }

  for (const entry of timed) {
    if (cluster.length === 0 || entry.startMin < clusterEnd) {
      cluster.push(entry)
      clusterEnd = Math.max(clusterEnd, entry.endMin)
    } else {
      flush()
      cluster = [entry]
      clusterEnd = entry.endMin
    }
  }
  flush()

  return result
}
