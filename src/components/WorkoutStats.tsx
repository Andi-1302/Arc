import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db, type WorkoutSession } from '../db'
import { formatDayLabel } from '../lib/date'
import { exerciseSeries, exerciseWeeklyVolume, exercisesByRecency, isPerSideExercise } from '../lib/workouts'
import AreaFilterChips, { type AreaFilterValue } from './AreaFilterChips'

export default function WorkoutStats() {
  const goals = useLiveQuery(() => db.goals.toArray())
  const areas = useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
  const sessions = useLiveQuery(() => db.workoutSessions.toArray())

  const [areaFilter, setAreaFilter] = useState<AreaFilterValue>('all')
  const [selected, setSelected] = useState<string | null>(null)

  if (!goals || !areas || !sessions) return null

  if (sessions.length === 0) {
    return <p className="text-sm opacity-60">No workout sessions logged yet.</p>
  }

  const areaOf = new Map(goals.map((g) => [g.id, g.areaId]))
  const filtered = sessions.filter((s) => {
    if (areaFilter === 'all') return true
    if (areaFilter === 'global') return false
    return s.goalId !== undefined && areaOf.get(s.goalId) === areaFilter
  })

  const exercises = exercisesByRecency(filtered)
  const activeName = exercises.find((e) => e.name === selected)?.name ?? exercises[0]?.name

  return (
    <div>
      <AreaFilterChips areas={areas} value={areaFilter} onChange={setAreaFilter} includeGlobal={false} />

      {exercises.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">No exercises logged for this filter.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {exercises.map((ex) => (
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
          {activeName && (
            <div className="mt-3">
              <ExerciseCharts key={activeName} name={activeName} sessions={filtered} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ExerciseCharts({ name, sessions }: { name: string; sessions: WorkoutSession[] }) {
  const series = exerciseSeries(sessions, name)
  const weekly = exerciseWeeklyVolume(sessions, name)
  const perSide = isPerSideExercise(sessions, name)

  const topSetData = series.map((p) => ({ x: p.date.slice(5), weight: p.topWeight }))
  const volumeData = weekly.map((p) => ({ x: p.week.slice(5), volume: Math.round(p.volume) }))
  const gapData = series.map((p) => ({ x: p.date.slice(5), gap: Math.round(p.sideGap) }))

  return (
    <div className="rounded-lg border border-black/5 bg-surface p-3">
      <p className="text-xs font-medium">{name}</p>

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
