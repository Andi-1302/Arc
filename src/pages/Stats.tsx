import MetricDashboard from '../components/MetricDashboard'
import ConsistencyHeatmap from '../components/ConsistencyHeatmap'
import PhotosDashboard from '../components/PhotosDashboard'

export default function Stats() {
  return (
    <div className="pb-8">
      <h1 className="px-4 pt-4 font-display text-3xl font-semibold">Stats</h1>

      <section className="px-4 pt-4">
        <h2 className="font-display text-lg font-semibold">Dashboard</h2>
        <div className="mt-2">
          <MetricDashboard />
        </div>
      </section>

      <section className="border-t border-black/5 px-4 py-4">
        <h2 className="font-display text-lg font-semibold">Consistency</h2>
        <p className="mt-1 text-xs opacity-60">Routine check-ins over the last 6 months.</p>
        <div className="mt-3">
          <ConsistencyHeatmap />
        </div>
      </section>

      <section className="border-t border-black/5 px-4 py-4">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <div className="mt-2">
          <PhotosDashboard />
        </div>
      </section>
    </div>
  )
}
