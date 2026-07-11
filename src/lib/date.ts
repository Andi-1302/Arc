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
