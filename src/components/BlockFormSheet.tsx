import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Block, Goal } from '../db'
import { addDays, todayISO } from '../lib/date'

export interface BlockFormData {
  name: string
  startDate: string
  endDate: string
  focusGoalId: string
  secondaryGoalIds: string[]
}

export default function BlockFormSheet({
  title,
  goals,
  initial,
  onClose,
  onSubmit,
}: {
  title: string
  goals: Goal[]
  initial?: Block
  onClose: () => void
  onSubmit: (data: BlockFormData) => Promise<void> | void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO())
  const [endDate, setEndDate] = useState(initial?.endDate ?? addDays(todayISO(), 84))
  const [focusGoalId, setFocusGoalId] = useState(initial?.focusGoalId ?? '')
  const [secondaryGoalIds, setSecondaryGoalIds] = useState<string[]>(initial?.secondaryGoalIds ?? [])
  const [saving, setSaving] = useState(false)

  function toggleSecondary(id: string) {
    setSecondaryGoalIds((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id)
      if (s.length >= 3) return s
      return [...s, id]
    })
  }

  async function handleSave() {
    if (!name.trim() || !focusGoalId) return
    setSaving(true)
    await onSubmit({
      name: name.trim(),
      startDate,
      endDate,
      focusGoalId,
      secondaryGoalIds: secondaryGoalIds.filter((id) => id !== focusGoalId),
    })
    setSaving(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-sm">
              Start
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              />
            </label>
            <label className="flex-1 text-sm">
              End
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              />
            </label>
          </div>

          <div>
            <p className="text-sm opacity-70">Focus goal (exactly one)</p>
            <div className="mt-2 space-y-2">
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setFocusGoalId(g.id)}
                  className={`flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm ${
                    focusGoalId === g.id ? 'border-accent bg-accent/5' : 'border-black/10'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm opacity-70">Secondary goals (up to 3)</p>
            <div className="mt-2 space-y-2">
              {goals
                .filter((g) => g.id !== focusGoalId)
                .map((g) => (
                  <label key={g.id} className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={secondaryGoalIds.includes(g.id)}
                      disabled={!secondaryGoalIds.includes(g.id) && secondaryGoalIds.length >= 3}
                      onChange={() => toggleSecondary(g.id)}
                    />
                    {g.name}
                  </label>
                ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim() || !focusGoalId}
          className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>,
    document.body,
  )
}
