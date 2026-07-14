import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import { daysBetween, todayISO } from '../lib/date'

const REMINDER_THRESHOLD_DAYS = 30

export default function BackupReminderBanner() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))
  const [dismissed, setDismissed] = useState(false)

  if (!settings || dismissed) return null

  const daysSince = settings.lastBackupAt ? daysBetween(settings.lastBackupAt.slice(0, 10), todayISO()) : Infinity
  if (daysSince <= REMINDER_THRESHOLD_DAYS) return null

  return (
    <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5">
      <div className="flex-1">
        <p className="text-sm font-medium text-warning">
          {settings.lastBackupAt ? "It's been over a month since your last backup." : "You haven't backed up yet."}
        </p>
        <Link to="/more/settings" className="mt-0.5 inline-block text-xs font-medium text-accent">
          Export a backup ›
        </Link>
      </div>
      <button type="button" onClick={() => setDismissed(true)} className="shrink-0 text-xs opacity-50">
        Dismiss
      </button>
    </div>
  )
}
