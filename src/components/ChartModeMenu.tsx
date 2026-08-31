import { useState } from 'react'

type Mode = 'auto' | 'always' | 'never'

const OPTIONS: { key: Mode; label: string }[] = [
  { key: 'always', label: 'Always show' },
  { key: 'auto', label: 'Auto' },
  { key: 'never', label: 'Never' },
]

/** Per-chart overflow menu on the Stats page — set a metric's dashboard mode without leaving Stats. */
export default function ChartModeMenu({
  label,
  mode,
  onChange,
}: {
  label: string
  mode: Mode
  onChange: (mode: Mode) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute right-2 top-2">
      <button
        type="button"
        aria-label={`Chart options for ${label}`}
        onClick={() => setOpen((o) => !o)}
        className="rounded px-1.5 text-sm leading-none opacity-40 hover:opacity-100"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-black/10 bg-surface text-xs shadow-lg">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  onChange(o.key)
                  setOpen(false)
                }}
                className={`block w-full px-2.5 py-1.5 text-left hover:bg-black/5 ${
                  o.key === mode ? 'font-semibold text-accent' : ''
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
