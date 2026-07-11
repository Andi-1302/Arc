import { db } from '../db'

const uid = () => crypto.randomUUID()

export async function toggleRoutineCheck(routineId: string, date: string) {
  const existing = await db.routineChecks.where('[routineId+date]').equals([routineId, date]).first()
  if (existing) {
    await db.routineChecks.update(existing.id, { done: !existing.done })
  } else {
    await db.routineChecks.add({ id: uid(), routineId, date, done: true })
  }
}

export async function addMetricEntry(metricId: string, date: string, value: number) {
  await db.entries.add({ id: uid(), metricId, date, value })
}

export async function saveDayLog(date: string, patch: { rating?: number; note?: string; tomorrowFocus?: string }) {
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
