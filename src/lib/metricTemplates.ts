import type { Metric } from '../db'

export interface MetricTemplate {
  key: string
  label: string
  unit: string
  direction: Metric['direction']
  aggregation: Metric['aggregation']
}

/** Metric creation templates (spec §5). */
export const METRIC_TEMPLATES: MetricTemplate[] = [
  { key: 'distance', label: 'Distance', unit: 'km', direction: 'increase', aggregation: 'sum' },
  { key: 'load', label: 'Load / weight', unit: 'kg', direction: 'increase', aggregation: 'max' },
  { key: 'reps', label: 'Reps', unit: 'reps', direction: 'increase', aggregation: 'max' },
  { key: 'time', label: 'Time', unit: 'min', direction: 'increase', aggregation: 'sum' },
  { key: 'bodyweight', label: 'Body weight', unit: 'kg', direction: 'decrease', aggregation: 'avg' },
  { key: 'gap', label: 'Percentage gap', unit: '%', direction: 'decrease', aggregation: 'last' },
  { key: 'rating', label: 'Rating', unit: '/10', direction: 'increase', aggregation: 'avg' },
  { key: 'custom', label: 'Custom', unit: '', direction: 'increase', aggregation: 'last' },
]
