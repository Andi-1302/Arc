import RoutineChecklist from '../components/RoutineChecklist'
import DailyCheckIn from '../components/DailyCheckIn'
import TomorrowPreview from '../components/TomorrowPreview'

export default function Today() {
  return (
    <div className="pb-4">
      <RoutineChecklist />
      <div className="border-t border-black/5">
        <DailyCheckIn />
      </div>
      <div className="border-t border-black/5">
        <TomorrowPreview />
      </div>
    </div>
  )
}
