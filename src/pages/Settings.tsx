import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, SETTINGS_ID } from '../db'
import {
  convertOneOffPlanEntriesToTodos,
  exportBackup,
  importBackup,
  loadDemoData,
  planEntryConversionPreview,
  updateSettings,
} from '../lib/actions'
import ErrorBoundary from '../components/ErrorBoundary'

export default function Settings() {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div className="p-4">
          <p className="text-sm font-medium">Something went wrong on the Settings page.</p>
          <p className="mt-1 text-sm opacity-60">{error.message}</p>
        </div>
      )}
    >
      <SettingsContent />
    </ErrorBoundary>
  )
}

/**
 * Split out from `Settings` so the ErrorBoundary above can actually catch a render
 * error here — a boundary never catches errors from the component that renders it,
 * only from its descendants.
 */
function SettingsContent() {
  // `settings` is undefined both while the live query is still loading and if the row
  // is ever genuinely missing (e.g. after a restore that touched that table). Either
  // way the page falls back to DEFAULT_SETTINGS and renders real UI — never blank.
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))
  const effectiveSettings = settings ?? DEFAULT_SETTINGS
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [question, setQuestion] = useState('')
  const [dueCap, setDueCap] = useState('')
  const [newCap, setNewCap] = useState('')
  const [cutoffHour, setCutoffHour] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoMessage, setDemoMessage] = useState<string | null>(null)
  const [convertBusy, setConvertBusy] = useState(false)
  const [convertMessage, setConvertMessage] = useState<string | null>(null)

  useEffect(() => {
    setQuestion(effectiveSettings.dailyQuestion)
    setDueCap(String(effectiveSettings.dueCardsPerDay))
    setNewCap(String(effectiveSettings.newCardsPerDay))
    setCutoffHour(String(effectiveSettings.dayCutoffHour ?? 4))
  }, [effectiveSettings])

  async function handleQuestionBlur() {
    const trimmed = question.trim()
    if (trimmed && trimmed !== effectiveSettings.dailyQuestion) {
      await updateSettings({ dailyQuestion: trimmed })
    }
  }

  async function handleDueCapBlur() {
    const n = Math.round(Number(dueCap))
    if (Number.isFinite(n) && n > 0 && n !== effectiveSettings.dueCardsPerDay) {
      await updateSettings({ dueCardsPerDay: n })
    }
  }

  async function handleNewCapBlur() {
    const n = Math.round(Number(newCap))
    if (Number.isFinite(n) && n > 0 && n !== effectiveSettings.newCardsPerDay) {
      await updateSettings({ newCardsPerDay: n })
    }
  }

  async function handleCutoffBlur() {
    const n = Math.round(Number(cutoffHour))
    if (Number.isFinite(n) && n >= 0 && n <= 12 && n !== (effectiveSettings.dayCutoffHour ?? 4)) {
      await updateSettings({ dayCutoffHour: n })
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

  async function handleLoadDemo() {
    setDemoBusy(true)
    setDemoMessage(null)
    try {
      await loadDemoData()
      setDemoMessage('Demo data loaded.')
    } catch (err) {
      setDemoMessage(err instanceof Error ? err.message : 'Could not load demo data.')
    } finally {
      setDemoBusy(false)
    }
  }

  async function handleConvertOneOffs() {
    setConvertBusy(true)
    setConvertMessage(null)
    try {
      const preview = await planEntryConversionPreview()
      if (preview.count === 0) {
        setConvertMessage('No untimed one-off plan entries to move.')
        return
      }
      const list = preview.titles.map((t) => `• ${t}`).join('\n')
      const noun = preview.count === 1 ? 'entry' : 'entries'
      const confirmed = window.confirm(
        `Move ${preview.count} untimed one-off plan ${noun} to Todos?\n\n${list}\n\nThe original plan ${noun} (and their checks) will be deleted.`,
      )
      if (!confirmed) return
      const moved = await convertOneOffPlanEntriesToTodos()
      setConvertMessage(`Moved ${moved} ${moved === 1 ? 'entry' : 'entries'} to Todos.`)
    } finally {
      setConvertBusy(false)
    }
  }

  const lastBackupLabel = effectiveSettings.lastBackupAt
    ? new Date(effectiveSettings.lastBackupAt).toLocaleDateString()
    : 'Never'

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
        <label className="mt-3 block text-sm">
          My day ends at
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={12}
            value={cutoffHour}
            onChange={(e) => setCutoffHour(e.target.value)}
            onBlur={handleCutoffBlur}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
          <span className="mt-1 block text-xs opacity-60">
            A check-in done after midnight but before this hour is offered for the previous day.
          </span>
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
            checked={effectiveSettings.hideRoutineChecklist}
            onChange={(e) => updateSettings({ hideRoutineChecklist: e.target.checked })}
            className="shrink-0"
          />
        </label>
      </section>

      <section className="mt-6 px-4">
        <h2 className="font-display text-lg font-semibold">Data</h2>
        <p className="mt-1 text-xs opacity-60">
          One-off plan entries with no time are really todos, not timetable items — move them over.
        </p>
        <button
          type="button"
          onClick={handleConvertOneOffs}
          disabled={convertBusy}
          className="mt-2 w-full rounded-lg border border-black/10 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {convertBusy ? 'Working…' : 'Move one-off plan entries to Todos'}
        </button>
        {convertMessage && <p className="mt-2 text-xs opacity-80">{convertMessage}</p>}
      </section>

      {import.meta.env.DEV && (
        <section className="mt-6 px-4">
          <h2 className="font-display text-lg font-semibold">Development</h2>
          <p className="mt-1 text-xs opacity-60">
            Development only — this section is not built into the deployed app.
          </p>
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={demoBusy}
            className="mt-2 w-full rounded-lg border border-warning/40 py-2.5 text-sm font-medium text-warning disabled:opacity-50"
          >
            {demoBusy ? 'Loading…' : 'Load demo data (~10 weeks of history)'}
          </button>
          {demoMessage && <p className="mt-2 text-xs opacity-80">{demoMessage}</p>}
        </section>
      )}

      <p className="mt-6 px-4 text-xs opacity-50">Blocks v{__APP_VERSION__}</p>
    </div>
  )
}
