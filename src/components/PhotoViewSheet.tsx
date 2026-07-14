import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Photo } from '../db'
import { deletePhoto, updatePhotoCaption } from '../lib/actions'
import { useObjectUrl } from '../lib/useObjectUrl'

export default function PhotoViewSheet({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const url = useObjectUrl(photo.blob)
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSaveCaption() {
    if (caption === (photo.caption ?? '')) return
    setSaving(true)
    await updatePhotoCaption(photo.id, caption || undefined)
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this photo? This can\'t be undone.')) return
    await deletePhoto(photo.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">{photo.date}</span>
        <button type="button" onClick={onClose} className="text-sm font-medium text-white">
          Close
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        {url && <img src={url} alt={photo.caption ?? photo.date} className="max-h-full max-w-full object-contain" />}
      </div>

      <div className="space-y-2 bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleSaveCaption}
          placeholder="Caption (optional)"
          disabled={saving}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleDelete}
          className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
        >
          Delete photo
        </button>
      </div>
    </div>,
    document.body,
  )
}
