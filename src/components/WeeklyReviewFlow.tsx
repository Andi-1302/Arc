import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Routine } from '../db'
import { addDays, isoWeekString, todayISO, WEEKDAY_LABELS } from '../lib/date'
import { computeWeeklyQuota } from '../lib/quota'
import { getCurrentBlock, getPrioritizedGoalIds, getScoredRoutineIds } from '../lib/prioritized'
import { dueCards } from '../lib/cards'
import { addMetricEntry, createWeeklyReview, setBlockWeekFocus, updateRoutineSchedule } from '../lib/actions'

export default function WeeklyReviewFlow({ week, onClose }: { week: string; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const today = todayISO()

  const blocks = useLiveQuery(() => db.blocks.toArray())
  const routines = useLiveQuery(() => db.routines.toArray())
  const checks = useLiveQuery(() => db.routineChecks.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const metrics = useLiveQuery(() => db.metrics.toArray())
  const entries = useLiveQuery(() => db.entries.toArray())
  const cards = useLiveQuery(() => db.cards.toArray())
  const cardReviews = useLiveQuery(() => db.cardReviews.toArray())

  const [reflection, setReflection] = useState('')
  const [nextFocus, setNextFocus] = useState('')
  const [quickValues, setQuickValues] = useState<Record<string, string>>({})
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, number[]>>({})
  const [saving, setSaving] = useState(false)

  if (!blocks || !routines || !checks || !goals || !metrics || !entries || !cards || !cardReviews) return null

  const block = getCurrentBlock(blocks)
  const prioritizedGoalIds = getPrioritizedGoalIds(block)
  const scoredRoutineIds = getScoredRoutineIds(routines, prioritizedGoalIds)
  const cardsToday = {
    due: dueCards(cards, today).length,
    reviewedToday: cardReviews.filter((r) => r.date === today).length,
  }
  const quota = computeWeeklyQuota(routines, checks, scoredRoutineIds, today, cardsToday)

  const reviewMetrics: { goalName: string; metric: (typeof metrics)[number] }[] = []
  if (block) {
    const focusGoal = goals.find((g) => g.id === block.focusGoalId)
    if (focusGoal) {
      for (const m of metrics.filter((m) => m.goalId === focusGoal.id)) {
        reviewMetrics.push({ goalName: focusGoal.name, metric: m })
      }
    }
    for (const sid of block.secondaryGoalIds) {
      const g = goals.find((x) => x.id === sid)
      const leading = metrics.find((m) => m.goalId === sid)
      if (g && leading) reviewMetrics.push({ goalName: g.name, metric: leading })
    }
  }

  function latestValue(metricId: string): number | undefined {
    const list = entries!.filter((e) => e.metricId === metricId).sort((a, b) => a.date.localeCompare(b.date))
    return list[list.length - 1]?.value
  }

  const scoredRoutines = routines.filter((r) => scoredRoutineIds.includes(r.id))

  function getSchedule(routine: Routine): number[] {
    return scheduleEdits[routine.id] ?? routine.schedule
  }

  function toggleDay(routine: Routine, day: number) {
    const current = getSchedule(routine)
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b)
    setScheduleEdits((s) => ({ ...s, [routine.id]: next }))
  }

  async function handleFinish() {
    setSaving(true)
    for (const [metricId, raw] of Object.entries(quickValues)) {
      const value = Number(raw)
      if (raw !== '' && !Number.isNaN(value)) await addMetricEntry(metricId, today, value)
    }
    for (const [routineId, schedule] of Object.entries(scheduleEdits)) {
      await updateRoutineSchedule(routineId, schedule)
    }
    if (block && nextFocus.trim()) {
      const nextWeek = isoWeekString(addDays(today, 7))
      await setBlockWeekFocus(block.id, nextWeek, nextFocus.trim())
    }
    await createWeeklyReview({
      isoWeek: week,
      processQuota: quota.ratio,
      note: reflection.trim(),
      nextWeekFocus: nextFocus.trim() || undefined,
    })
    setSaving(false)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Weekly review — step {step} of 4</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        {step === 1 && (
          <div className="mt-3">
            <p className="text-sm opacity-70">This week's process quota</p>
            <p className="mt-2 font-display text-4xl font-semibold">
              {quota.completed}/{quota.scheduled}
              <span className="ml-2 text-lg opacity-60">
                {quota.scheduled > 0 ? `${Math.round(quota.ratio * 100)}%` : ''}
              </span>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-3 space-y-3">
            <p className="text-sm opacity-70">Latest values for this block's key metrics.</p>
            {reviewMetrics.length === 0 ? (
              <p className="text-sm opacity-50">No block metrics to review.</p>
            ) : (
              reviewMetrics.map(({ goalName, metric }) => (
                <div key={metric.id} className="rounded-lg border border-black/10 px-3 py-2">
                  <p className="text-xs opacity-60">{goalName}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-xs opacity-60">
                      last: {latestValue(metric.id) ?? '—'} {metric.unit}
                    </span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`New value (${metric.unit})`}
                    value={quickValues[metric.id] ?? ''}
                    onChange={(e) => setQuickValues((v) => ({ ...v, [metric.id]: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-3">
            <label className="block text-sm">
              Reflection
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="mt-3 space-y-4">
            <label className="block text-sm">
              Next week's focus
              <input
                type="text"
                value={nextFocus}
                onChange={(e) => setNextFocus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <div>
              <p className="text-sm opacity-70">Adjust routine schedules (optional)</p>
              <div className="mt-2 space-y-3">
                {scoredRoutines.map((routine) => (
                  <div key={routine.id}>
                    <p className="text-sm font-medium">{routine.name}</p>
                    <div className="mt-1 flex gap-1">
                      {WEEKDAY_LABELS.map((label, day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(routine, day)}
                          className={`h-7 w-7 rounded-full text-[11px] font-medium ${
                            getSchedule(routine).includes(day) ? 'bg-accent text-white' : 'bg-black/5 text-ink'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg border border-black/10 py-2 text-sm"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Finish review
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
