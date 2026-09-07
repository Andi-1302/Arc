import type { PlanEntry, PlanEntryCheck, Todo } from '../db'

/**
 * Untimed one-off plan entries are the things people have been using as todos — they
 * don't belong in a timetable. Recurring (`weekly`) entries and anything with a `time`
 * are left alone.
 */
export function convertibleEntries(entries: PlanEntry[]): PlanEntry[] {
  return entries.filter((e) => e.recurrence === 'once' && !e.time)
}

export interface ConversionPreview {
  count: number
  titles: string[]
}

/** What "Move one-off plan entries to Todos" would do, without changing anything. */
export function previewConversion(entries: PlanEntry[]): ConversionPreview {
  const toConvert = convertibleEntries(entries)
  return { count: toConvert.length, titles: toConvert.map((e) => e.title) }
}

/**
 * Pure builder for the Todo rows a conversion would create: title, areaId and dueDate come
 * from the entry; done/doneAt come from the entry's matching PlanEntryCheck, if any.
 * Doesn't touch the database — the caller deletes the converted entries and their checks.
 */
export function buildTodosFromPlanEntries(
  entries: PlanEntry[],
  checks: PlanEntryCheck[],
  makeId: () => string,
  now: () => string = () => new Date().toISOString(),
): Todo[] {
  return convertibleEntries(entries).map((entry) => {
    const check = checks.find((c) => c.planEntryId === entry.id)
    const done = check?.done ?? false
    return {
      id: makeId(),
      title: entry.title,
      done,
      doneAt: done ? check!.date : undefined,
      dueDate: entry.date,
      areaId: entry.areaId,
      priority: 0,
      sortOrder: 0,
      createdAt: now(),
    }
  })
}
