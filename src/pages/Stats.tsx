import type { ReactNode } from 'react'
import GeneralMetricsSection from '../components/GeneralMetricsSection'
import MetricDashboard from '../components/MetricDashboard'
import ConsistencyHeatmap from '../components/ConsistencyHeatmap'
import PhotosDashboard from '../components/PhotosDashboard'
import WorkoutStats from '../components/WorkoutStats'
import { useCollapsed } from '../lib/useCollapsed'

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const [collapsed, toggle] = useCollapsed(id)
  return (
    <section className="border-t border-black/5 px-4 py-4 first-of-type:border-t-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between"
      >
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="text-xs opacity-40">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <>
          {subtitle && <p className="mt-1 text-xs opacity-60">{subtitle}</p>}
          <div className="mt-2">{children}</div>
        </>
      )}
    </section>
  )
}

export default function Stats() {
  return (
    <div className="pb-8">
      <h1 className="px-4 pt-4 font-display text-3xl font-semibold">Stats</h1>

      <Section id="general" title="General metrics" subtitle="Metrics not tied to a goal — log entries here.">
        <GeneralMetricsSection />
      </Section>

      <Section id="dashboard" title="Dashboard">
        <MetricDashboard />
      </Section>

      <Section id="consistency" title="Consistency" subtitle="Routine check-ins over the last 6 months.">
        <ConsistencyHeatmap />
      </Section>

      <Section id="workouts" title="Workouts">
        <WorkoutStats />
      </Section>

      <Section id="photos" title="Photos">
        <PhotosDashboard />
      </Section>
    </div>
  )
}
