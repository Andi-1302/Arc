import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Photo } from '../db'
import { todayISO } from '../lib/date'
import { compressImageToBlob } from '../lib/image'
import { createPhoto } from '../lib/actions'
import PhotoThumb from './PhotoThumb'
import PhotoViewSheet from './PhotoViewSheet'
import PhotoCompareSlider from './PhotoCompareSlider'
import PhotoSideBySide from './PhotoSideBySide'

export default function PhotosDashboard() {
  const goals = useLiveQuery(() => db.goals.where('status').notEqual('archived').toArray())
  const allPhotos = useLiveQuery(() => db.photos.toArray())

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<Photo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)
  const [useSlider, setUseSlider] = useState(false)

  if (!goals || !allPhotos) return null

  const photoGoals = goals.filter((g) => g.modules.includes('photos'))

  if (photoGoals.length === 0) {
    return (
      <p className="text-sm opacity-60">
        No goals have the photos module enabled yet — turn it on for a goal to start tracking progress photos
        here.
      </p>
    )
  }

  const activeGoalId = selectedGoalId ?? photoGoals[0].id
  const activeGoal = photoGoals.find((g) => g.id === activeGoalId)

  const photos = [...allPhotos.filter((p) => p.goalId === activeGoalId)].sort((a, b) => a.date.localeCompare(b.date))
  const photosNewestFirst = [...photos].reverse()
  const beforePhoto = photos.find((p) => p.id === beforeId) ?? photos[0]
  const afterPhoto = photos.find((p) => p.id === afterId) ?? photos[photos.length - 1]

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const blob = await compressImageToBlob(file)
      await createPhoto(activeGoalId, blob, todayISO())
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="text-xs opacity-60">
        Daily photos live in your phone's gallery — this is for periodic progress shots, added any time.
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {photoGoals.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelectedGoalId(g.id)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
              g.id === activeGoalId ? 'border-accent bg-accent/5 text-accent' : 'border-black/10 opacity-70'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{activeGoal?.name}</h3>
        <label className="text-sm font-medium text-accent">
          {uploading ? 'Adding…' : '+ Add photo'}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">No photos for this goal yet.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[...photos].reverse().map((photo) => (
              <PhotoThumb key={photo.id} photo={photo} onClick={() => setViewing(photo)} />
            ))}
          </div>

          {photos.length >= 2 && beforePhoto && afterPhoto && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium opacity-60">Compare</p>
                <label className="flex items-center gap-1.5 text-xs opacity-70">
                  <input type="checkbox" checked={useSlider} onChange={(e) => setUseSlider(e.target.checked)} />
                  Slider
                </label>
              </div>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={beforePhoto.id}
                  onChange={(e) => setBeforeId(e.target.value)}
                  className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-xs"
                >
                  {photosNewestFirst.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.date}
                    </option>
                  ))}
                </select>
                <select
                  value={afterPhoto.id}
                  onChange={(e) => setAfterId(e.target.value)}
                  className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-xs"
                >
                  {photosNewestFirst.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.date}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2">
                {useSlider ? (
                  <PhotoCompareSlider before={beforePhoto} after={afterPhoto} />
                ) : (
                  <PhotoSideBySide before={beforePhoto} after={afterPhoto} />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {viewing && <PhotoViewSheet photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
