import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Photo } from '../db'
import { useToday } from '../lib/useToday'
import { compressImageToBlob } from '../lib/image'
import { createPhoto, updatePhotoPose } from '../lib/actions'
import PhotoThumb from './PhotoThumb'
import PhotoViewSheet from './PhotoViewSheet'

const POSES: Exclude<Photo['pose'], undefined>[] = ['front', 'back', 'side', 'other']
type Filter = 'all' | 'unsorted' | Exclude<Photo['pose'], undefined>

export default function PhotosSection({ goalId }: { goalId: string }) {
  const today = useToday()
  const photos = useLiveQuery(() => db.photos.where('goalId').equals(goalId).sortBy('date'), [goalId])
  const [viewing, setViewing] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadPose, setUploadPose] = useState<Exclude<Photo['pose'], undefined>>('front')
  const [filter, setFilter] = useState<Filter>('all')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = await compressImageToBlob(file)
      await createPhoto(goalId, blob, today, { pose: uploadPose })
    } finally {
      setUploading(false)
    }
  }

  if (!photos) return null

  const unsortedCount = photos.filter((p) => !p.pose).length
  const visible =
    filter === 'all'
      ? photos
      : filter === 'unsorted'
        ? photos.filter((p) => !p.pose)
        : photos.filter((p) => p.pose === filter)
  const newestFirst = [...visible].reverse()

  const filterChips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    ...POSES.map((p) => ({ key: p as Filter, label: p[0].toUpperCase() + p.slice(1) })),
    ...(unsortedCount > 0 ? [{ key: 'unsorted' as Filter, label: `Unsorted (${unsortedCount})` }] : []),
  ]

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
        Track physique and strength progress — front, back and side shots, monthly is plenty. Daily photos belong in
        your phone's gallery; the app never stores video, so link those under Resources.
      </p>

      <div className="mt-3">
        <p className="text-xs opacity-60">New photo is a…</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {POSES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setUploadPose(p)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                uploadPose === p ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">No photos yet.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  filter === chip.key ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {newestFirst.map((photo) => (
              <div key={photo.id}>
                <PhotoThumb photo={photo} onClick={() => setViewing(photo)} />
                {photo.pose ? (
                  <p className="mt-0.5 text-center text-[10px] capitalize opacity-50">{photo.pose}</p>
                ) : (
                  <div className="mt-0.5 flex justify-center gap-0.5">
                    {POSES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-label={`Tag as ${p}`}
                        onClick={() => updatePhotoPose(photo.id, p)}
                        className="rounded border border-black/10 px-1 text-[10px] uppercase opacity-60"
                      >
                        {p[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {viewing && <PhotoViewSheet photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
