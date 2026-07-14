import type { Photo } from '../db'
import { useObjectUrl } from '../lib/useObjectUrl'

function Frame({ photo, label }: { photo: Photo; label: string }) {
  const url = useObjectUrl(photo.blob)
  return (
    <div className="flex-1">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/5">
        {url && <img src={url} alt={`${label} (${photo.date})`} className="h-full w-full object-cover" />}
      </div>
      <p className="mt-1 text-center text-xs opacity-60">{photo.date}</p>
    </div>
  )
}

export default function PhotoSideBySide({ before, after }: { before: Photo; after: Photo }) {
  return (
    <div className="flex gap-2">
      <Frame photo={before} label="Before" />
      <Frame photo={after} label="After" />
    </div>
  )
}
