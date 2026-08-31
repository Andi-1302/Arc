import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db, type WorkoutSession } from '../db'
import { exerciseNamesForGoal, exerciseSeries, exerciseWeeklyVolume, isPerSideExercise } from '../lib/workouts'

export default function WorkoutStats() {
  const goals = useLiveQuery(() => db.goals.where('status').notEqual('archived').toArray())
  const sessions = useLiveQuery(() => db.workoutSessions.toArray())

  if (!goals || !sessions) return null

  const workoutGoals = goals.filter(
    (g) => g.modules.includes('workouts') && sessions.some((s) => s.goalId === g.id),
  )

  if (workoutGoals.length === 0) {
    return <p className="text-sm opacity-60">No workout sessions logged yet.</p>
  }

  return (
    <div className="space-y-5">
      {workoutGoals.map((goal) => {
        const goalSessions = sessions.filter((s) => s.goalId === goal.id)
        const names = exerciseNamesForGoal(sessions, goal.id)
        return (
          <div key={goal.id}>
            <h3 className="text-sm font-semibold">{goal.name}</h3>
            <div className="mt-2 space-y-4">
              {names.map((name) => (
                <ExerciseCharts key={name} name={name} sessions={goalSessions} />
              ))}
            </div>
          </div>
        )
      })}
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
