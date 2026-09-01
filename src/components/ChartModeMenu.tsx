import { useState } from 'react'

export type ChartMode = 'auto' | 'always' | 'never'

const CHIP_LABEL: Record<ChartMode, string> = { auto: 'Auto', always: 'Pinned', never: 'Hidden' }
const CHIP_STYLE: Record<ChartMode, string> = {
  auto: 'border-ink/25 text-ink/70',
  always: 'border-accent bg-accent/10 text-accent',
  never: 'border-ink/15 text-ink/40',
}
const MENU_LABEL: Record<ChartMode, string> = { always: 'Always show', auto: 'Auto', never: 'Never' }

/**
 * Visible visibility control shown in a chart's header row. The chip states its
 * current mode; tapping opens a small menu. 44px minimum tap target, visible focus ring.
 */
export default function ChartModeMenu({
  label,
  mode,
  onChange,
  modes = ['always', 'auto', 'never'],
}: {
  label: string
  mode: ChartMode
  onChange: (mode: ChartMode) => void
  modes?: ChartMode[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Dashboard visibility for ${label}: ${CHIP_LABEL[mode]}`}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${CHIP_STYLE[mode]}`}
      >
        {CHIP_LABEL[mode]}
        <span aria-hidden className="text-[10px] opacity-60">
          ▾
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-black/10 bg-surface text-xs shadow-lg">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === mode}
                onClick={() => {
                  onChange(m)
                  setOpen(false)
                }}
                className={`block w-full px-3 py-2.5 text-left hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none ${
                  m === mode ? 'font-semibold text-accent' : ''
                }`}
              >
                {MENU_LABEL[m]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
