import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, type Goal, type MetricEntry } from '../db'
import { TIER_LABEL, type PriorityTier } from '../lib/goalOrder'
import Sparkline from './Sparkline'

export default function GoalCard({ goal, tier }: { goal: Goal; tier: PriorityTier }) {
  const navigate = useNavigate()
  const milestones = useLiveQuery(() => db.milestones.where('goalId').equals(goal.id).toArray(), [goal.id])
  const metrics = useLiveQuery(() => db.metrics.where('goalId').equals(goal.id).toArray(), [goal.id])
  const firstMetricId = metrics?.[0]?.id
  const entries = useLiveQuery(
    () =>
      firstMetricId
        ? db.entries.where('metricId').equals(firstMetricId).sortBy('date')
        : Promise.resolve<MetricEntry[]>([]),
    [firstMetricId],
  )

  const progress =
    goal.modules.includes('milestones') && milestones && milestones.length > 0
      ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
      : null

  const grayed = tier === 'other' || tier === 'paused'
  const label = TIER_LABEL[tier]

  return (
    <button
      type="button"
      onClick={() => navigate(`/goals/${goal.id}`)}
      className={`flex flex-col overflow-hidden rounded-xl border border-black/5 bg-surface text-left shadow-sm ${
        grayed ? 'opacity-50 grayscale' : ''
      }`}
    >
      <div
        className="h-16 w-full bg-black/5"
        style={
          goal.coverImage
            ? { backgroundImage: `url(${goal.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      />
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-medium">{goal.name}</span>
          {label && (
            <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              {label}
            </span>
          )}
        </div>
        {progress !== null && (
          <div className="mt-1.5 h-1 rounded-full bg-black/10">
            <div className="h-1 rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>
        )}
        {entries && entries.length > 1 && (
          <div className="mt-1.5">
            <Sparkline data={entries} />
          </div>
        )}
      </div>
    </button>
  )
}
