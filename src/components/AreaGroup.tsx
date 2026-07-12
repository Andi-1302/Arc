import { useState } from 'react'
import type { Area, Block, Goal } from '../db'
import { goalTier } from '../lib/goalOrder'
import GoalCard from './GoalCard'
import AreaFormSheet from './AreaFormSheet'

export default function AreaGroup({
  area,
  goals,
  block,
}: {
  area: Area
  goals: Goal[]
  block: Block | undefined
}) {
  const [editing, setEditing] = useState(false)

  return (
    <section className="mt-2">
      {area.image ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="relative flex h-20 w-full items-end justify-between overflow-hidden px-4 py-2 text-left text-white"
          style={{ backgroundImage: `url(${area.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-black/35" />
          <h2 className="relative font-display text-lg font-semibold">{area.name}</h2>
          <span className="relative text-xs opacity-80">Edit</span>
        </button>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="flex w-full items-center gap-2 px-4 py-2 text-left">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color }} />
          <h2 className="font-display text-lg font-semibold">{area.name}</h2>
          <span className="ml-auto text-xs opacity-50">Edit</span>
        </button>
      )}

      {goals.length === 0 ? (
        <p className="px-4 pb-3 text-sm opacity-60">No goals yet in this area.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-1.5">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} tier={goalTier(goal, block)} />
          ))}
        </div>
      )}

      {editing && <AreaFormSheet area={area} onClose={() => setEditing(false)} />}
    </section>
  )
}
