import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function WeeklyReviews() {
  const reviews = useLiveQuery(() => db.reviews.orderBy('isoWeek').reverse().toArray())

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <Link to="/more" className="text-sm font-medium text-accent">
          ‹ More
        </Link>
      </div>
      <h1 className="px-4 pt-2 font-display text-3xl font-semibold">Weekly reviews</h1>

      {!reviews || reviews.length === 0 ? (
        <p className="mt-4 px-4 text-sm opacity-60">No reviews yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5 px-4">
          {reviews.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{r.isoWeek}</span>
                <span className="opacity-60">{Math.round(r.processQuota * 100)}% quota</span>
              </div>
              {r.note && <p className="mt-1 text-sm opacity-70">{r.note}</p>}
              {r.nextWeekFocus && <p className="mt-1 text-xs opacity-50">Next: {r.nextWeekFocus}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
