import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area } from '../db'
import { createArea, deleteArea, updateArea } from '../lib/actions'
import { compressImage } from '../lib/image'

export default function AreaFormSheet({
  area,
  onClose,
  onSaved,
}: {
  area?: Area
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const [name, setName] = useState(area?.name ?? '')
  const [color, setColor] = useState(area?.color ?? '#1F4FE0')
  const [image, setImage] = useState<string | undefined>(area?.image)
  const [saving, setSaving] = useState(false)

  const goalCount = useLiveQuery(
    () => (area ? db.goals.where('areaId').equals(area.id).count() : Promise.resolve(0)),
    [area?.id],
  )

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(await compressImage(file))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const patch = { name: name.trim(), color, image }
    let id: string
    if (area) {
      await updateArea(area.id, patch)
      id = area.id
    } else {
      id = await createArea(patch)
    }
    setSaving(false)
    onSaved?.(id)
    onClose()
  }

  async function handleDelete() {
    if (!area) return
    if (!window.confirm(`Delete area "${area.name}"? This can't be undone.`)) return
    await deleteArea(area.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{area ? 'Edit area' : 'New area'}</h3>
        <label className="mt-3 block text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />
        </label>
        <label className="mt-3 flex items-center gap-3 text-sm">
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 rounded border border-black/10"
          />
        </label>
        <label className="mt-3 block text-sm">
          Header image (optional)
          <input type="file" accept="image/*" onChange={handleFile} className="mt-1 block w-full text-sm" />
        </label>
        {image && <img src={image} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" />}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        {area && (
          <div className="mt-4 border-t border-black/5 pt-4">
            {goalCount === 0 ? (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
              >
                Delete area
              </button>
            ) : (
              <p className="text-xs opacity-60">
                Move or archive {goalCount === undefined ? "this area's goals" : `this area's ${goalCount} goal${goalCount === 1 ? '' : 's'}`} first to delete it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
