import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import BlockBar from '../components/BlockBar'
import BackupReminderBanner from '../components/BackupReminderBanner'
import Checklist from '../components/Checklist'
import TodayTodos from '../components/TodayTodos'
import DailyCheckIn from '../components/DailyCheckIn'
import TomorrowPreview from '../components/TomorrowPreview'
import WeeklyReviewPrompt from '../components/WeeklyReviewPrompt'

export default function Today() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))

  return (
    <div className="pb-4">
      <BlockBar />
      <BackupReminderBanner />
      {!settings?.hideRoutineChecklist && (
        <div className="border-t border-black/5">
          <Checklist />
        </div>
      )}
      <div className="border-t border-black/5">
        <TodayTodos />
      </div>
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
