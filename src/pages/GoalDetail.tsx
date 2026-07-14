import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Milestone } from '../db'
import { getCurrentBlock } from '../lib/prioritized'
import { goalTier, TIER_LABEL } from '../lib/goalOrder'
import { archiveGoal } from '../lib/actions'
import MetricsSection from '../components/MetricsSection'
import MilestoneChain from '../components/MilestoneChain'
import EditGoalSheet from '../components/EditGoalSheet'
import ResourcesSection from '../components/ResourcesSection'
import CardsSection from '../components/CardsSection'
import PhotosSection from '../components/PhotosSection'

export default function GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const goal = useLiveQuery(() => (goalId ? db.goals.get(goalId) : undefined), [goalId])
  const area = useLiveQuery(() => (goal ? db.areas.get(goal.areaId) : undefined), [goal?.areaId])
  const blocks = useLiveQuery(() => db.blocks.toArray())
  const milestones = useLiveQuery(
    () => (goalId ? db.milestones.where('goalId').equals(goalId).toArray() : Promise.resolve<Milestone[]>([])),
    [goalId],
  )

  if (!goal || !blocks) return null

  const tier = goalTier(goal, getCurrentBlock(blocks))
  const progress =
    goal.modules.includes('milestones') && milestones && milestones.length > 0
      ? Math.round((milestones.filter((m) => m.done).length / milestones.length) * 100)
      : null

  async function handleArchive() {
    if (!goalId) return
    await archiveGoal(goalId)
    navigate('/goals')
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-4 pt-4">
        <Link to="/goals" className="text-sm font-medium text-accent">
          ‹ Goals
        </Link>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-accent">
            Edit
          </button>
          {goal.status !== 'archived' && (
            <button type="button" onClick={handleArchive} className="text-sm font-medium opacity-60">
              Archive
            </button>
          )}
        </div>
      </div>

      {editing && <EditGoalSheet goal={goal} onClose={() => setEditing(false)} />}

      {goal.coverImage && (
        <div
          className="mt-2 aspect-video w-full"
          style={{ backgroundImage: `url(${goal.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}

      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-60">
          {area && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: area.color }} />
              {area.name}
            </span>
          )}
          <span>·</span>
          <span className="capitalize">{goal.status}</span>
          {TIER_LABEL[tier] && (
            <>
              <span>·</span>
              <span className="font-medium text-accent">{TIER_LABEL[tier]}</span>
            </>
          )}
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold">{goal.name}</h1>
        {goal.description && <p className="mt-1 text-sm opacity-70">{goal.description}</p>}
        {progress !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs opacity-60">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-black/10">
              <div className="h-1.5 rounded-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {goal.modules.includes('metrics') && <MetricsSection goalId={goal.id} />}
      {goal.modules.includes('milestones') && <MilestoneChain goalId={goal.id} />}
      {goal.modules.includes('resources') && <ResourcesSection goal={goal} mode="resources" />}
      {goal.modules.includes('notes') && <ResourcesSection goal={goal} mode="notes" />}
      {goal.modules.includes('cards') && <CardsSection goalId={goal.id} />}
      {goal.modules.includes('photos') && <PhotosSection goalId={goal.id} />}
    </div>
  )
}
