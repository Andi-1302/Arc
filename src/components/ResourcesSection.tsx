import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Resource } from '../db'
import { isVideoLink } from '../lib/links'
import ResourceFormSheet from './ResourceFormSheet'
import AddCardSheet from './AddCardSheet'

export default function ResourcesSection({ goal, mode }: { goal: Goal; mode: 'resources' | 'notes' }) {
  const all = useLiveQuery(() => db.resources.where('goalId').equals(goal.id).toArray(), [goal.id])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [cardFrom, setCardFrom] = useState<Resource | null>(null)

  if (!all) return null

  const showUrl = mode === 'resources'
  const bothModulesEnabled = goal.modules.includes('resources') && goal.modules.includes('notes')
  const items = bothModulesEnabled ? all.filter((r) => (showUrl ? Boolean(r.url) : !r.url)) : all

  const title = showUrl ? 'Resources' : 'Notes'
  const emptyText = showUrl
    ? 'No resources yet — add links, including video (YouTube, Drive, Photos…).'
    : 'No notes yet.'

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-accent">
          + Add
        </button>
      </div>
      {showUrl && (
        <p className="mt-0.5 text-xs opacity-60">
          Links only — videos live in your gallery or cloud, the app just keeps the link.
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {items.map((r) => (
            <li key={r.id} className="py-2.5">
              <button type="button" onClick={() => setEditing(r)} className="block w-full text-left">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {r.title}
                  {isVideoLink(r.url) && (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                      ▶ Video
                    </span>
                  )}
                </p>
                {r.url && <p className="mt-0.5 truncate text-xs text-accent">{r.url}</p>}
                {r.note && <p className="mt-0.5 text-sm opacity-70">{r.note}</p>}
              </button>
              {goal.modules.includes('cards') && r.note && (
                <button
                  type="button"
                  onClick={() => setCardFrom(r)}
                  className="mt-1 text-xs font-medium text-accent"
                >
                  Create card from note
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && <ResourceFormSheet goalId={goal.id} showUrl={showUrl} onClose={() => setAdding(false)} />}
      {editing && (
        <ResourceFormSheet goalId={goal.id} resource={editing} showUrl={showUrl} onClose={() => setEditing(null)} />
      )}
      {cardFrom && (
        <AddCardSheet
          goalId={goal.id}
          initialFront={cardFrom.title}
          initialBack={cardFrom.note ?? ''}
          sourceResourceId={cardFrom.id}
          onClose={() => setCardFrom(null)}
        />
      )}
    </div>
  )
}
