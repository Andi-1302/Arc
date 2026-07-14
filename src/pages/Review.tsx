import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID, type Card } from '../db'
import { todayISO } from '../lib/date'
import { buildReviewQueue, dueCards } from '../lib/cards'
import CardReviewFlow from '../components/CardReviewFlow'

export default function Review() {
  const today = todayISO()
  const goals = useLiveQuery(() => db.goals.where('status').notEqual('archived').toArray())
  const cards = useLiveQuery(() => db.cards.toArray())
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))

  const [reviewQueue, setReviewQueue] = useState<Card[] | null>(null)

  if (!goals || !cards || !settings) return null

  const knowledgeGoals = goals.filter((g) => g.modules.includes('cards'))
  const allDueCount = dueCards(cards, today).length

  function startReview(scopedCards: Card[]) {
    setReviewQueue(buildReviewQueue(scopedCards, today, settings!.dueCardsPerDay, settings!.newCardsPerDay))
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <Link to="/more" className="text-sm font-medium text-accent">
          ‹ More
        </Link>
      </div>
      <h1 className="px-4 pt-2 font-display text-3xl font-semibold">Review</h1>
      <p className="px-4 pt-1 text-sm opacity-70">Pick a topic, or review everything due today.</p>

      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => startReview(cards)}
          disabled={allDueCount === 0}
          className="flex w-full items-center justify-between rounded-xl border-2 border-accent bg-accent/5 px-4 py-3 text-left disabled:opacity-50"
        >
          <span className="font-display text-lg font-semibold text-accent">All due</span>
          <span className="text-sm font-medium text-accent">{allDueCount}</span>
        </button>
      </div>

      {knowledgeGoals.length === 0 ? (
        <p className="mt-4 px-4 text-sm opacity-60">No knowledge goals with cards yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/5 px-4">
          {knowledgeGoals.map((goal) => {
            const goalCards = cards.filter((c) => c.goalId === goal.id)
            const dueCount = dueCards(goalCards, today).length
            return (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => startReview(goalCards)}
                  disabled={dueCount === 0}
                  className="flex w-full items-center justify-between py-3 text-left disabled:opacity-40"
                >
                  <span className="text-sm font-medium">{goal.name}</span>
                  <span className="text-sm tabular-nums opacity-60">{dueCount} due</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {reviewQueue && <CardReviewFlow queue={reviewQueue} onClose={() => setReviewQueue(null)} />}
    </div>
  )
}
