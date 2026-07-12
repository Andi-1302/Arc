import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import RoutineChecklist from '../components/RoutineChecklist'
import DailyCheckIn from '../components/DailyCheckIn'
import TomorrowPreview from '../components/TomorrowPreview'

export default function Today() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))

  return (
    <div className="pb-4">
      {!settings?.hideRoutineChecklist && <RoutineChecklist />}
      <div className="border-t border-black/5">
        <DailyCheckIn />
      </div>
      <div className="border-t border-black/5">
        <TomorrowPreview />
      </div>
    </div>
  )
}
