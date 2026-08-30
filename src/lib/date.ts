/** Mon..Sun, matching Routine.schedule's 0=Monday convention. */
export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const WEEKDAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(iso: string, n: number): string {
  const date = fromISO(iso)
  date.setDate(date.getDate() + n)
  return toISO(date)
}

/** 0 = Monday .. 6 = Sunday, matching Routine.schedule's convention. */
export function weekdayMon0(iso: string): number {
  return (fromISO(iso).getDay() + 6) % 7
}

export function startOfIsoWeek(iso: string): string {
  return addDays(iso, -weekdayMon0(iso))
}

export function endOfIsoWeek(iso: string): string {
  return addDays(iso, 6 - weekdayMon0(iso))
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000)
}

/** Human day label, e.g. "Mon, 25 Aug" — locale-independent so it renders identically everywhere. */
export function formatDayLabel(iso: string): string {
  const date = fromISO(iso)
  return `${WEEKDAY_ABBR[weekdayMon0(iso)]}, ${date.getDate()} ${MONTH_ABBR[date.getMonth()]}`
}

/** Full weekday name, e.g. "Monday". */
export function weekdayName(iso: string): string {
  return WEEKDAY_FULL[weekdayMon0(iso)]
}

/** ISO 8601 week string, e.g. "2026-W28" (Monday-start weeks, week 1 contains the year's first Thursday). */
export function isoWeekString(iso: string): string {
  const d = fromISO(iso)
  const dayNum = weekdayMon0(iso) + 1 // Monday=1..Sunday=7
  d.setDate(d.getDate() + 4 - dayNum) // Thursday of this ISO week
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
