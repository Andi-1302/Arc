import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LoggedSet, type WorkoutSession, type WorkoutTemplate } from '../db'
import { useToday } from '../lib/useToday'
import { deleteWorkoutSession } from '../lib/actions'
import { sessionSummary } from '../lib/workouts'
import WorkoutTemplateSheet from './WorkoutTemplateSheet'
import WorkoutLoggerSheet from './WorkoutLoggerSheet'

export default function WorkoutsSection({ goalId }: { goalId: string }) {
  const today = useToday()
  const templates = useLiveQuery(() => db.workoutTemplates.where('goalId').equals(goalId).toArray(), [goalId])
  const sessions = useLiveQuery(() => db.workoutSessions.where('goalId').equals(goalId).toArray(), [goalId])

  const [templateSheet, setTemplateSheet] = useState<WorkoutTemplate | 'new' | null>(null)
  const [logging, setLogging] = useState<WorkoutTemplate | null>(null)
  const [picking, setPicking] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  if (!templates || !sessions) return null

  const active = templates.filter((t) => !t.archived)
  const archived = templates.filter((t) => t.archived)
  const history = [...sessions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )

  function startLog() {
    if (active.length === 1) setLogging(active[0])
    else if (active.length > 1) setPicking(true)
  }

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Workouts</h2>
        <button
          type="button"
          onClick={startLog}
          disabled={active.length === 0}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Log workout
        </button>
      </div>

      {picking && (
        <div className="mt-2 rounded-lg border border-black/10 p-2">
          <p className="px-1 pb-1 text-xs opacity-60">Which template?</p>
          {active.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setLogging(t)
                setPicking(false)
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-black/5"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium opacity-70">Templates</p>
          <button type="button" onClick={() => setTemplateSheet('new')} className="text-sm font-medium text-accent">
            + New template
          </button>
        </div>
        {active.length === 0 ? (
          <p className="mt-1 text-sm opacity-60">No templates yet — create one to plan and log workouts.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {active.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">{t.name}</span>
                  <span className="block text-xs opacity-50">
                    {t.exercises.length} exercise{t.exercises.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogging(t)}
                    className="rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-accent"
                  >
                    Log
                  </button>
                  <button type="button" onClick={() => setTemplateSheet(t)} className="text-xs opacity-50">
                    Edit
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {archived.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="mt-2 text-xs font-medium opacity-50"
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
        )}
        {showArchived &&
          archived.map((t) => (
            <div
              key={t.id}
              className="mt-1.5 flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm opacity-60"
            >
              <span>{t.name}</span>
              <button type="button" onClick={() => setTemplateSheet(t)} className="text-xs">
                Edit
              </button>
            </div>
          ))}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium opacity-70">History</p>
        {history.length === 0 ? (
          <p className="mt-1 text-sm opacity-60">No sessions logged yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {history.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                open={expanded === session.id}
                onToggle={() => setExpanded((id) => (id === session.id ? null : session.id))}
              />
            ))}
          </ul>
        )}
      </div>

      {templateSheet && (
        <WorkoutTemplateSheet
          template={templateSheet === 'new' ? undefined : templateSheet}
          goalId={goalId}
          onClose={() => setTemplateSheet(null)}
        />
      )}
      {logging && (
        <WorkoutLoggerSheet
          template={logging}
          goalId={goalId}
          date={today}
          onClose={() => setLogging(null)}
        />
      )}
    </div>
  )
}

function SessionRow({
  session,
  open,
  onToggle,
}: {
  session: WorkoutSession
  open: boolean
  onToggle: () => void
}) {
  const byExercise = new Map<string, LoggedSet[]>()
  for (const set of session.sets) {
    const list = byExercise.get(set.exerciseName) ?? []
    list.push(set)
    byExercise.set(set.exerciseName, list)
  }

  return (
    <li className="py-2">
      <button type="button" onClick={onToggle} className="flex w-full items-baseline justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="text-sm font-medium">{session.name}</span>
          <span className="block text-xs opacity-50">
            {session.date} · {session.sets.length} set{session.sets.length === 1 ? '' : 's'}
          </span>
        </span>
        <span className="shrink-0 text-xs opacity-40">{open ? '▾' : '▸'}</span>
      </button>
      {!open && session.sets.length > 0 && (
        <p className="mt-0.5 truncate text-xs opacity-60">{sessionSummary(session)}</p>
      )}
      {open && (
        <div className="mt-2 space-y-2">
          {[...byExercise.entries()].map(([name, sets]) => (
            <div key={name}>
              <p className="text-xs font-medium">{name}</p>
              <ul className="mt-0.5 text-xs opacity-70">
                {sets.map((s) => (
                  <li key={s.id} className="tabular-nums">
                    {s.side && s.side !== 'both' ? `${s.side} · ` : ''}
                    set {s.setIndex + 1}: {s.weight ?? '—'} kg × {s.reps ?? '—'}
                    {s.done ? ' ✓' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {session.note && <p className="text-xs opacity-60">{session.note}</p>}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this session?')) deleteWorkoutSession(session.id)
            }}
            className="text-xs font-medium text-warning"
          >
            Delete session
          </button>
        </div>
      )}
    </li>
  )
}
