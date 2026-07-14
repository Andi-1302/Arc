import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, SETTINGS_ID } from '../db'
import { exportBackup, importBackup, updateSettings } from '../lib/actions'

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [question, setQuestion] = useState('')
  const [dueCap, setDueCap] = useState('')
  const [newCap, setNewCap] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!settings) return
    setQuestion(settings.dailyQuestion)
    setDueCap(String(settings.dueCardsPerDay))
    setNewCap(String(settings.newCardsPerDay))
  }, [settings])

  if (!settings) return null

  async function handleQuestionBlur() {
    const trimmed = question.trim()
    if (trimmed && trimmed !== settings!.dailyQuestion) {
      await updateSettings({ dailyQuestion: trimmed })
    }
  }

  async function handleDueCapBlur() {
    const n = Math.round(Number(dueCap))
    if (Number.isFinite(n) && n > 0 && n !== settings!.dueCardsPerDay) {
      await updateSettings({ dueCardsPerDay: n })
    }
  }

  async function handleNewCapBlur() {
    const n = Math.round(Number(newCap))
    if (Number.isFinite(n) && n > 0 && n !== settings!.newCardsPerDay) {
      await updateSettings({ newCardsPerDay: n })
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportBackup()
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      !window.confirm(
        "Import will replace ALL data in this app with this file's contents. This can't be undone. Continue?",
      )
    ) {
      return
    }
    setImporting(true)
    try {
      const text = await file.text()
      await importBackup(text)
      window.alert('Import complete. Reloading…')
      window.location.reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const lastBackupLabel = settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString() : 'Never'

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <Link to="/more" className="text-sm font-medium text-accent">
          ‹ More
        </Link>
      </div>
      <h1 className="px-4 pt-2 font-display text-3xl font-semibold">Settings</h1>

      <div className="mx-4 mt-4 rounded-xl border-2 border-accent bg-accent/5 p-4">
        <p className="text-xs font-medium text-accent">Backup</p>
        <p className="mt-1 font-display text-2xl font-semibold">Last backup: {lastBackupLabel}</p>
        <p className="mt-1 text-xs opacity-60">
          Everything lives only on this device. Export regularly — browsers can evict local storage.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : 'Export backup (JSON)'}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="mt-2 w-full rounded-lg border border-black/10 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import backup — replaces everything'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-semibold">Daily check-in</h2>
        <label className="mt-2 block text-sm">
          Question
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onBlur={handleQuestionBlur}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
      </section>

      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-semibold">Flashcard queue</h2>
        <div className="mt-2 flex gap-3">
          <label className="flex-1 text-sm">
            Due per day
            <input
              type="number"
              inputMode="numeric"
              value={dueCap}
              onChange={(e) => setDueCap(e.target.value)}
              onBlur={handleDueCapBlur}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="flex-1 text-sm">
            New per day
            <input
              type="number"
              inputMode="numeric"
              value={newCap}
              onChange={(e) => setNewCap(e.target.value)}
              onBlur={handleNewCapBlur}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-semibold">Today screen</h2>
        <label className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span>
            Hide today's checklist
            <span className="block text-xs opacity-60">
              Hide routines on the Today screen for days you only want tracking.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.hideRoutineChecklist}
            onChange={(e) => updateSettings({ hideRoutineChecklist: e.target.checked })}
            className="shrink-0"
          />
        </label>
      </section>

      <p className="mt-6 px-4 text-xs opacity-50">Blocks v{__APP_VERSION__}</p>
    </div>
  )
}
