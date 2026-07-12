import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import BlockBar from '../components/BlockBar'
import RoutineChecklist from '../components/RoutineChecklist'
import DailyCheckIn from '../components/DailyCheckIn'
import TomorrowPreview from '../components/TomorrowPreview'
import WeeklyReviewPrompt from '../components/WeeklyReviewPrompt'

export default function Today() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))

  return (
    <div className="pb-4">
      <BlockBar />
      {!settings?.hideRoutineChecklist && (
        <div className="border-t border-black/5">
          <RoutineChecklist />
        </div>
      )}
      <div className="border-t border-black/5">
        <DailyCheckIn />
      </div>
      <div className="border-t border-black/5">
        <TomorrowPreview />
      </div>
      <div className="border-t border-black/5">
        <WeeklyReviewPrompt />
      </div>
    </div>
  )
}
