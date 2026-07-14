import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { buildHeatmapWeeks, heatmapLevel, type HeatmapLevel } from '../lib/heatmap'

const WEEKS_BACK = 26 // ~6 months, spec §8.3

const LEVEL_STYLE: Record<HeatmapLevel, string> = {
  none: 'bg-black/[0.04]',
  empty: 'bg-black/10',
  low: 'bg-accent/25',
  mid: 'bg-accent/45',
  high: 'bg-accent/70',
  full: 'bg-accent',
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ConsistencyHeatmap() {
  const routines = useLiveQuery(() => db.routines.toArray())
  const checks = useLiveQuery(() => db.routineChecks.toArray())

  if (!routines || !checks) return null

  const weeks = buildHeatmapWeeks(routines, checks, WEEKS_BACK)

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => {
          const firstDay = week[0]
          const isMonthStart = firstDay ? Number(firstDay.date.slice(8, 10)) <= 7 : false
          return (
            <div key={wi} className="flex flex-col gap-[3px]">
              <div className="h-3 text-[8px] leading-3 opacity-50">
                {firstDay && isMonthStart ? MONTH_LABELS[Number(firstDay.date.slice(5, 7)) - 1] : ''}
              </div>
              {Array.from({ length: 7 }, (_, ri) => {
                const day = week[ri]
                if (!day) return <div key={ri} className="h-2.5 w-2.5 rounded-[2px]" />
                const level = heatmapLevel(day)
                return (
                  <div
                    key={ri}
                    title={`${day.date}: ${day.scheduled === 0 ? 'nothing scheduled' : `${day.completed}/${day.scheduled} done`}`}
                    className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_STYLE[level]}`}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] opacity-50">
        <span>Less</span>
        {(['empty', 'low', 'mid', 'high', 'full'] as const).map((level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_STYLE[level]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
