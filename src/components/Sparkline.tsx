import { LineChart, Line } from 'recharts'
import type { MetricEntry } from '../db'

export default function Sparkline({ data }: { data: Pick<MetricEntry, 'value'>[] }) {
  return (
    <LineChart width={110} height={20} data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke="var(--color-accent)"
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  )
}
