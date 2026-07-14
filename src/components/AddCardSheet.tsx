import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../db'
import { createCard, deleteCard, updateCard } from '../lib/actions'

export default function AddCardSheet({
  goalId,
  card,
  initialFront,
  initialBack,
  sourceResourceId,
  onClose,
}: {
  goalId: string
  card?: Card
  initialFront?: string
  initialBack?: string
  sourceResourceId?: string
  onClose: () => void
}) {
  const [front, setFront] = useState(card?.front ?? initialFront ?? '')
  const [back, setBack] = useState(card?.back ?? initialBack ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!front.trim() || !back.trim()) return
    setSaving(true)
    if (card) await updateCard(card.id, { front: front.trim(), back: back.trim() })
    else await createCard(goalId, { front: front.trim(), back: back.trim(), sourceResourceId })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!card) return
    if (!window.confirm('Delete this card? This can\'t be undone.')) return
    await deleteCard(card.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{card ? 'Edit card' : 'New card'}</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Front
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Back
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !front.trim() || !back.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        {card && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
            >
              Delete card
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
