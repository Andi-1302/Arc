import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Block, type Goal } from '../db'
import { todayISO } from '../lib/date'
import { getPrioritizedGoalIds, getScoredRoutineIds } from '../lib/prioritized'
import { averageProcessQuota } from '../lib/quota'
import { closeBlock, confirmAndPauseRoutines, createBlock } from '../lib/actions'
import BlockFormSheet, { type BlockFormData } from './BlockFormSheet'

export default function BlockEndFlow({
  block,
  goals,
  onClose,
}: {
  block: Block
  goals: Goal[]
  onClose: () => void
}) {
  const [step, setStep] = useState<'summary' | 'reflection' | 'next'>('summary')
  const [reflection, setReflection] = useState(block.reflection ?? '')
  const [saving, setSaving] = useState(false)

  const metrics = useLiveQuery(() => db.metrics.toArray())
  const entries = useLiveQuery(() => db.entries.toArray())
  const milestones = useLiveQuery(() => db.milestones.toArray())
  const routines = useLiveQuery(() => db.routines.toArray())
  const checks = useLiveQuery(() => db.routineChecks.toArray())

  if (!metrics || !entries || !milestones || !routines || !checks) return null

  const today = todayISO()
  const blockGoalIds = getPrioritizedGoalIds(block)
  const blockMetrics = metrics.filter((m) => m.goalId && blockGoalIds.includes(m.goalId))

  function startEnd(metricId: string) {
    const list = entries!
      .filter((e) => e.metricId === metricId && e.date >= block.startDate && e.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date))
    return { start: list[0]?.value, end: list[list.length - 1]?.value }
  }

  const milestonesDone = milestones.filter(
    (m) => blockGoalIds.includes(m.goalId) && m.done && m.doneAt && m.doneAt >= block.startDate && m.doneAt <= today,
  )

  const scoredRoutineIds = getScoredRoutineIds(routines, blockGoalIds)
  const avgQuota = averageProcessQuota(routines, checks, scoredRoutineIds, block.startDate, today)

  async function handleReflectionSave() {
    setSaving(true)
    await closeBlock(block.id, reflection.trim())
    setSaving(false)
    setStep('next')
  }

  async function handleStartNext(data: BlockFormData) {
    await createBlock(data)
    const nextIds = [data.focusGoalId, ...data.secondaryGoalIds]
    await confirmAndPauseRoutines(blockGoalIds, nextIds, routines!)
    onClose()
  }

  if (step === 'next') {
    return <BlockFormSheet title="Start next block" goals={goals} onClose={onClose} onSubmit={handleStartNext} />
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Close "{block.name}"</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        {step === 'summary' && (
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-sm opacity-70">Metrics — start vs. now</p>
              {blockMetrics.length === 0 ? (
                <p className="mt-1 text-sm opacity-50">No metrics on this block's goals.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {blockMetrics.map((m) => {
                    const { start, end } = startEnd(m.id)
                    return (
                      <li key={m.id} className="flex items-center justify-between text-sm">
                        <span>{m.name}</span>
                        <span className="tabular-nums opacity-70">
                          {start ?? '—'} → {end ?? '—'} {m.unit}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div>
              <p className="text-sm opacity-70">Milestones completed this block</p>
              <p className="mt-1 font-display text-2xl font-semibold">{milestonesDone.length}</p>
            </div>

            <div>
              <p className="text-sm opacity-70">Average weekly process quota</p>
              <p className="mt-1 font-display text-2xl font-semibold">{Math.round(avgQuota * 100)}%</p>
            </div>

            <button
              type="button"
              onClick={() => setStep('reflection')}
              className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white"
            >
              Next
            </button>
          </div>
        )}

        {step === 'reflection' && (
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              Reflection
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={handleReflectionSave}
              disabled={saving}
              className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Close block & start next
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
