import type { Card } from '../db'

export function dueCards(cards: Card[], today: string): Card[] {
  return cards.filter((c) => c.dueDate <= today)
}

/** Today's review queue, capped per spec §7 (default 30 due + 10 new from Settings). */
export function buildReviewQueue(cards: Card[], today: string, dueCap: number, newCap: number): Card[] {
  const due = dueCards(cards, today)
  const reviewOnes = due.filter((c) => c.reps > 0).slice(0, dueCap)
  const newOnes = due.filter((c) => c.reps === 0).slice(0, newCap)
  return [...reviewOnes, ...newOnes]
}

export function csvEscape(value: string): string {
  return /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Spec §5: CSV export `front;back`. */
export function cardsToCsv(cards: Card[]): string {
  const rows = ['front;back', ...cards.map((c) => `${csvEscape(c.front)};${csvEscape(c.back)}`)]
  return rows.join('\n')
}
