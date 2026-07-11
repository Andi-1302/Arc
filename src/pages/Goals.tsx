import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getCurrentBlock } from '../lib/prioritized'
import { sortGoals } from '../lib/goalOrder'
import AreaGroup from '../components/AreaGroup'
import AreaFormSheet from '../components/AreaFormSheet'
import GoalWizard from '../components/GoalWizard'

export default function Goals() {
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
  const goals = useLiveQuery(() => db.goals.where('status').notEqual('archived').toArray())
  const blocks = useLiveQuery(() => db.blocks.toArray())

  const [newArea, setNewArea] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  if (!areas || !goals || !blocks) return null

  const block = getCurrentBlock(blocks)

  return (
    <div className="relative pb-24">
      <div className="flex items-center justify-between px-4 py-4">
        <h1 className="font-display text-3xl font-semibold">Goals</h1>
        <button type="button" onClick={() => setNewArea(true)} className="text-sm font-medium text-accent">
          + Area
        </button>
      </div>

      {areas.length === 0 ? (
        <p className="px-4 text-sm opacity-70">No areas yet — add one to start.</p>
      ) : (
        areas.map((area) => (
          <AreaGroup
            key={area.id}
            area={area}
            goals={sortGoals(
              goals.filter((g) => g.areaId === area.id),
              block,
            )}
            block={block}
          />
        ))
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-10 flex justify-center">
        <div className="w-full max-w-xl px-4">
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            aria-label="New goal"
            className="pointer-events-auto ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-medium text-white shadow-lg"
          >
            +
          </button>
        </div>
      </div>

      {newArea && <AreaFormSheet onClose={() => setNewArea(false)} />}
      {wizardOpen && <GoalWizard areas={areas} onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
