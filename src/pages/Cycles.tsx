import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Block } from '../db'
import { getCurrentBlock, getPrioritizedGoalIds } from '../lib/prioritized'
import { confirmAndPauseRoutines, createBlock, updateBlockPriorities } from '../lib/actions'
import BlockBar from '../components/BlockBar'
import BlockFormSheet, { type BlockFormData } from '../components/BlockFormSheet'
import BlockEndFlow from '../components/BlockEndFlow'

export default function Cycles() {
  const blocks = useLiveQuery(() => db.blocks.toArray())
  const goals = useLiveQuery(() => db.goals.where('status').equals('active').toArray())
  const routines = useLiveQuery(() => db.routines.toArray())

  const [editing, setEditing] = useState(false)
  // Captured at "Close block" time — closing sets closedAt, which would make
  // getCurrentBlock(blocks) stop returning it mid-flow if we kept using that live value.
  const [endingBlock, setEndingBlock] = useState<Block | null>(null)
  const [startingFirst, setStartingFirst] = useState(false)

  if (!blocks || !goals || !routines) return null

  const block = getCurrentBlock(blocks)
  const history = blocks.filter((b) => b.closedAt).sort((a, b) => b.startDate.localeCompare(a.startDate))

  async function handleSaveEdit(data: BlockFormData) {
    if (!block) return
    const prevPrioritized = getPrioritizedGoalIds(block)
    await updateBlockPriorities(block.id, data)
    const nextIds = [data.focusGoalId, ...data.secondaryGoalIds]
    await confirmAndPauseRoutines(prevPrioritized, nextIds, routines!)
    setEditing(false)
  }

  async function handleCreateFirst(data: BlockFormData) {
    await createBlock(data)
    setStartingFirst(false)
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <Link to="/more" className="text-sm font-medium text-accent">
          ‹ More
        </Link>
      </div>
      <h1 className="px-4 pt-2 font-display text-3xl font-semibold">Cycles</h1>

      {block ? (
        <>
          <BlockBar />
          <div className="flex gap-4 px-4 pb-2">
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-accent">
              Edit priorities
            </button>
            <button type="button" onClick={() => setEndingBlock(block)} className="text-sm font-medium text-warning">
              Close block
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 py-4">
          <p className="text-sm opacity-70">No active block yet.</p>
          <button
            type="button"
            onClick={() => setStartingFirst(true)}
            className="mt-2 text-sm font-medium text-accent"
          >
            Start a block
          </button>
        </div>
      )}

      <div className="border-t border-black/5 px-4 py-4">
        <h2 className="font-display text-lg font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">No closed blocks yet.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {history.map((b) => (
              <li key={b.id} className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-xs opacity-60">
                  {b.startDate} – {b.endDate}
                </p>
                {b.reflection && <p className="mt-1 text-sm opacity-70">{b.reflection}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && block && (
        <BlockFormSheet title="Edit priorities" goals={goals} initial={block} onClose={() => setEditing(false)} onSubmit={handleSaveEdit} />
      )}
      {startingFirst && (
        <BlockFormSheet title="Start a block" goals={goals} onClose={() => setStartingFirst(false)} onSubmit={handleCreateFirst} />
      )}
      {endingBlock && <BlockEndFlow block={endingBlock} goals={goals} onClose={() => setEndingBlock(null)} />}
    </div>
  )
}
