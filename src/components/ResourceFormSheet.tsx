import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Resource } from '../db'
import { createResource, deleteResource, updateResource } from '../lib/actions'

export default function ResourceFormSheet({
  goalId,
  resource,
  showUrl,
  onClose,
}: {
  goalId: string
  resource?: Resource
  showUrl: boolean
  onClose: () => void
}) {
  const [title, setTitle] = useState(resource?.title ?? '')
  const [url, setUrl] = useState(resource?.url ?? '')
  const [note, setNote] = useState(resource?.note ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const patch = {
      title: title.trim(),
      url: showUrl ? url.trim() || undefined : undefined,
      note: note.trim() || undefined,
    }
    if (resource) await updateResource(resource.id, patch)
    else await createResource(goalId, patch)
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!resource) return
    if (!window.confirm(`Delete "${resource.title}"? This can't be undone.`)) return
    await deleteResource(resource.id)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">
            {resource ? 'Edit' : 'New'} {showUrl ? 'resource' : 'note'}
          </h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={showUrl ? 'e.g. YouTube tutorial' : 'e.g. Key takeaway'}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          {showUrl && (
            <label className="block text-sm">
              Link (optional)
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
              />
            </label>
          )}
          <label className="block text-sm">
            {showUrl ? 'Your notes (optional)' : 'Note'}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>

        {resource && (
          <div className="mt-4 border-t border-black/5 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full rounded-lg border border-warning/40 py-2 text-sm font-medium text-warning"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
