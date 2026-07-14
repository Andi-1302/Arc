import type { Module } from '../db'

const MODULE_INFO: { key: Module; label: string; hint: string }[] = [
  { key: 'metrics', label: 'Metrics', hint: 'Numeric tracking with charts.' },
  { key: 'milestones', label: 'Milestones', hint: 'Ordered progression checklist.' },
  { key: 'routines', label: 'Routines', hint: 'Recurring items on the Today checklist.' },
  { key: 'resources', label: 'Resources', hint: 'Links (incl. video) and your own notes on them.' },
  { key: 'cards', label: 'Cards', hint: 'Flashcards with spaced repetition.' },
  { key: 'photos', label: 'Photos', hint: 'Progress photos, added any time.' },
  { key: 'notes', label: 'Notes', hint: 'Free-form notes on the goal.' },
]

export default function ModuleToggles({
  modules,
  onChange,
}: {
  modules: Module[]
  onChange: (modules: Module[]) => void
}) {
  function toggle(key: Module) {
    onChange(modules.includes(key) ? modules.filter((m) => m !== key) : [...modules, key])
  }

  return (
    <div className="space-y-2">
      {MODULE_INFO.map(({ key, label, hint }) => (
        <label key={key} className="flex items-start gap-3 rounded-lg border border-black/10 px-3 py-2 text-sm">
          <input type="checkbox" checked={modules.includes(key)} onChange={() => toggle(key)} className="mt-0.5" />
          <span>
            <span className="font-medium">{label}</span>
            <span className="block opacity-60">{hint}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
