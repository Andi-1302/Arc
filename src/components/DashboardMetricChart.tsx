import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Metric, MetricEntry } from '../db'
import { aggregateWeekly } from '../lib/metrics'

export default function DashboardMetricChart({ metric, entries }: { metric: Metric; entries: MetricEntry[] }) {
  const weekly = aggregateWeekly(entries, metric.aggregation)
  const latest = entries[entries.length - 1]

  return (
    <div className="rounded-lg border border-black/5 bg-surface p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{metric.name}</h3>
        <span className="text-xs tabular-nums opacity-60">
          {latest ? `${latest.value} ${metric.unit}` : 'No entries'}
        </span>
      </div>
      <div className="mt-2 h-28">
        {weekly.length === 0 ? (
          <p className="text-xs opacity-50">No entries in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <XAxis dataKey="week" tick={{ fontSize: 9 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 9 }} width={28} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
