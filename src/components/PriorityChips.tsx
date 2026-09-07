const LABELS: Record<0 | 1 | 2, string> = { 0: 'Normal', 1: 'Important', 2: 'Urgent' }
const PRIORITIES = [0, 1, 2] as const

/** Priority is always set by tapping a labelled chip — never shown or entered as a number. */
export default function PriorityChips({
  value,
  onChange,
  size = 'sm',
}: {
  value: 0 | 1 | 2
  onChange: (priority: 0 | 1 | 2) => void
  size?: 'sm' | 'md'
}) {
  const pad = size === 'md' ? 'px-3 py-1.5' : 'px-2 py-0.5'
  return (
    <div className="flex gap-1.5">
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          aria-label={`Set priority ${LABELS[p]}`}
          className={`rounded-full border text-xs font-medium ${pad} ${
            value === p ? 'border-accent bg-accent/10 text-accent' : 'border-black/10 opacity-60'
          }`}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  )
}
