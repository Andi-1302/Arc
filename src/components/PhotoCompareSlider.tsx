import { useState } from 'react'
import type { Photo } from '../db'
import { useObjectUrl } from '../lib/useObjectUrl'

export default function PhotoCompareSlider({ before, after }: { before: Photo; after: Photo }) {
  const beforeUrl = useObjectUrl(before.blob)
  const afterUrl = useObjectUrl(after.blob)
  const [percent, setPercent] = useState(50)

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black/5">
        {beforeUrl && <img src={beforeUrl} alt={`Before (${before.date})`} className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}>
          {afterUrl && <img src={afterUrl} alt={`After (${after.date})`} className="h-full w-full object-cover" />}
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${percent}%` }} />
        <span className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          {before.date}
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          {after.date}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => setPercent(Number(e.target.value))}
        className="mt-2 w-full"
      />
    </div>
  )
}
