import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Card } from '../db'
import { cardsToCsv } from '../lib/cards'
import AddCardSheet from './AddCardSheet'

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CardsSection({ goalId }: { goalId: string }) {
  const cards = useLiveQuery(() => db.cards.where('goalId').equals(goalId).toArray(), [goalId])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Card | null>(null)

  if (!cards) return null

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Cards</h2>
        <div className="flex items-center gap-3">
          {cards.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(cardsToCsv(cards), 'cards.csv')}
              className="text-sm font-medium text-accent"
            >
              Export CSV
            </button>
          )}
          <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-accent">
            + Add
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">No cards yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {cards.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setEditing(c)} className="block w-full py-2.5 text-left">
                <p className="truncate text-sm font-medium">{c.front}</p>
                <p className="mt-0.5 truncate text-xs opacity-60">{c.back}</p>
                <p className="mt-0.5 text-[10px] opacity-40">Due {c.dueDate}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && <AddCardSheet goalId={goalId} onClose={() => setAdding(false)} />}
      {editing && <AddCardSheet goalId={goalId} card={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
