import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db, SETTINGS_ID, type WorkoutSession } from '../db'
import { formatDayLabel } from '../lib/date'
import {
  exerciseDashboardMode,
  exerciseSeries,
  exerciseWeeklyVolume,
  exercisesByRecency,
  isPerSideExercise,
} from '../lib/workouts'
import { setExerciseDashboardMode } from '../lib/actions'
import AreaFilterChips, { type AreaFilterValue } from './AreaFilterChips'
import ChartModeMenu, { type ChartMode } from './ChartModeMenu'

// Exercises are binary — shown or hidden. The shared chip may emit 'always'; treat it as 'auto'.
const toExerciseMode = (mode: ChartMode): 'auto' | 'never' => (mode === 'never' ? 'never' : 'auto')

export default function WorkoutStats() {
  const goals = useLiveQuery(() => db.goals.toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
  const sessions = useLiveQuery(() => db.workoutSessions.toArray())
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))

  const [areaFilter, setAreaFilter] = useState<AreaFilterValue>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (!goals || !areas || !sessions) return null

  if (sessions.length === 0) {
    return <p className="text-sm opacity-60">No workout sessions logged yet.</p>
  }

  const hidden = settings?.hiddenExercises ?? []
  const areaOf = new Map(goals.map((g) => [g.id, g.areaId]))
  const filtered = sessions.filter((s) => {
    if (areaFilter === 'all') return true
    if (areaFilter === 'global') return false
    return s.goalId !== undefined && areaOf.get(s.goalId) === areaFilter
  })

  const all = exercisesByRecency(filtered)
  const visible = all.filter((ex) => exerciseDashboardMode(ex.name, hidden) === 'auto')
  const overflow = all.filter((ex) => exerciseDashboardMode(ex.name, hidden) === 'never')
  const activeName = visible.find((e) => e.name === selected)?.name ?? visible[0]?.name

  return (
    <div>
      <AreaFilterChips areas={areas} value={areaFilter} onChange={setAreaFilter} includeGlobal={false} />

      {all.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">No exercises logged for this filter.</p>
      ) : (
        <>
          {visible.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {visible.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => setSelected(ex.name)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    ex.name === activeName ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
                  }`}
                >
                  {ex.name} <span className="opacity-50">· {formatDayLabel(ex.lastDate)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm opacity-60">Every exercise for this filter is hidden.</p>
          )}

          {activeName && (
            <div className="mt-3">
              <ExerciseCharts
                key={activeName}
                name={activeName}
                sessions={filtered}
                onModeChange={(mode) => setExerciseDashboardMode(activeName, toExerciseMode(mode))}
              />
            </div>
          )}

          {overflow.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                className="text-sm font-medium text-accent"
              >
                {showAll ? 'Hide' : 'Show all'} ({overflow.length})
              </button>
              {showAll && (
                <ul className="mt-2 divide-y divide-black/5">
                  {overflow.map((ex) => (
                    <li key={ex.name} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0">
                        <span className="truncate text-sm font-medium">{ex.name}</span>
                        <span className="block text-xs opacity-50">Last logged {formatDayLabel(ex.lastDate)}</span>
                      </span>
                      <ChartModeMenu
                        label={ex.name}
                        mode="never"
                        modes={['auto', 'never']}
                        onChange={(mode) => setExerciseDashboardMode(ex.name, toExerciseMode(mode))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ExerciseCharts({
  name,
  sessions,
  onModeChange,
}: {
  name: string
  sessions: WorkoutSession[]
  onModeChange: (mode: ChartMode) => void
}) {
  const series = exerciseSeries(sessions, name)
  const weekly = exerciseWeeklyVolume(sessions, name)
  const perSide = isPerSideExercise(sessions, name)

  const topSetData = series.map((p) => ({ x: p.date.slice(5), weight: p.topWeight }))
  const volumeData = weekly.map((p) => ({ x: p.week.slice(5), volume: Math.round(p.volume) }))
  const gapData = series.map((p) => ({ x: p.date.slice(5), gap: Math.round(p.sideGap) }))

  return (
    <div className="rounded-lg border border-black/5 bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{name}</p>
        <ChartModeMenu label={name} mode="auto" modes={['auto', 'never']} onChange={onModeChange} />
      </div>

      <p className="mt-2 text-[11px] opacity-50">Top-set weight (kg)</p>
      <div className="mt-1 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={topSetData}>
            <XAxis dataKey="x" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={26} />
            <Tooltip />
            <Line type="monotone" dataKey="weight" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] opacity-50">Weekly volume (kg × reps)</p>
      <div className="mt-1 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volumeData}>
            <XAxis dataKey="x" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} width={30} />
            <Tooltip />
            <Bar dataKey="volume" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {perSide && (
        <>
          <p className="mt-2 text-[11px] opacity-50">Left / right gap (%)</p>
          <div className="mt-1 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gapData}>
                <XAxis dataKey="x" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={26} />
                <Tooltip />
                <Line type="monotone" dataKey="gap" stroke="var(--color-warning)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
