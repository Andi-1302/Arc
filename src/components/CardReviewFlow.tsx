import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../db'
import { gradeCard } from '../lib/actions'

export default function CardReviewFlow({ queue, onClose }: { queue: Card[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const card = queue[index]
  if (!card) return null

  async function handleGrade(grade: 0 | 1 | 2 | 3) {
    await gradeCard(card, grade)
    setRevealed(false)
    if (index + 1 >= queue.length) onClose()
    else setIndex((i) => i + 1)
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
        <span className="text-sm opacity-60">
          {index + 1} / {queue.length}
        </span>
        <button type="button" onClick={onClose} className="text-sm font-medium opacity-60">
          Close
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl font-semibold">{card.front}</p>
        {revealed && (
          <>
            <div className="my-4 h-px w-16 bg-black/10" />
            <p className="text-lg">{card.back}</p>
          </>
        )}
      </div>

      <div className="px-4 pb-6">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-white"
          >
            Reveal
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleGrade(0)}
              className="rounded-lg border border-warning/40 py-3 text-sm font-medium text-warning"
            >
              Forgot
            </button>
            <button type="button" onClick={() => handleGrade(1)} className="rounded-lg border border-black/10 py-3 text-sm font-medium">
              Hard
            </button>
            <button type="button" onClick={() => handleGrade(2)} className="rounded-lg border border-black/10 py-3 text-sm font-medium">
              Good
            </button>
            <button
              type="button"
              onClick={() => handleGrade(3)}
              className="rounded-lg border border-accent/40 py-3 text-sm font-medium text-accent"
            >
              Easy
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
