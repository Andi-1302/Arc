import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Photo } from '../db'
import { todayISO } from '../lib/date'
import { compressImageToBlob } from '../lib/image'
import { createPhoto } from '../lib/actions'
import PhotoThumb from './PhotoThumb'
import PhotoViewSheet from './PhotoViewSheet'

export default function PhotosSection({ goalId }: { goalId: string }) {
  const photos = useLiveQuery(() => db.photos.where('goalId').equals(goalId).sortBy('date'), [goalId])
  const [viewing, setViewing] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = await compressImageToBlob(file)
      await createPhoto(goalId, blob, todayISO())
    } finally {
      setUploading(false)
    }
  }

  if (!photos) return null

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <label className="text-sm font-medium text-accent">
          {uploading ? 'Adding…' : '+ Add'}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      </div>
      <p className="mt-1 text-xs opacity-60">
        Daily photos live in your phone's gallery — add progress shots here whenever, weekly is a good rhythm.
      </p>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">No photos yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[...photos].reverse().map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} onClick={() => setViewing(photo)} />
          ))}
        </div>
      )}

      {viewing && <PhotoViewSheet photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
