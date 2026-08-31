import type { Area } from '../db'

export type AreaFilterValue = 'all' | 'global' | string

/** The area filter chip row shared by the Stats dashboard and the workout stats. */
export default function AreaFilterChips({
  areas,
  value,
  onChange,
  includeGlobal = true,
}: {
  areas: Area[]
  value: AreaFilterValue
  onChange: (value: AreaFilterValue) => void
  includeGlobal?: boolean
}) {
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
      active ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
    }`

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => onChange('all')} className={chip(value === 'all')}>
        All
      </button>
      {includeGlobal && (
        <button type="button" onClick={() => onChange('global')} className={chip(value === 'global')}>
          General
        </button>
      )}
      {areas.map((area) => (
        <button key={area.id} type="button" onClick={() => onChange(area.id)} className={chip(value === area.id)}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: area.color }} />
          {area.name}
        </button>
      ))}
    </div>
  )
}
