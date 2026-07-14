import type { Photo } from '../db'
import { useObjectUrl } from '../lib/useObjectUrl'

export default function PhotoThumb({ photo, onClick }: { photo: Photo; onClick?: () => void }) {
  const url = useObjectUrl(photo.blob)

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square overflow-hidden rounded-lg bg-black/5"
      disabled={!onClick}
    >
      {url && <img src={url} alt={photo.caption ?? photo.date} className="h-full w-full object-cover" />}
    </button>
  )
}
