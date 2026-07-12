import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Goal, Module } from '../db'
import { updateGoal } from '../lib/actions'
import { compressImage } from '../lib/image'
import ModuleToggles from './ModuleToggles'

export default function EditGoalSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [name, setName] = useState(goal.name)
  const [description, setDescription] = useState(goal.description ?? '')
  const [coverImage, setCoverImage] = useState<string | undefined>(goal.coverImage)
  const [modules, setModules] = useState<Module[]>(goal.modules)
  const [saving, setSaving] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverImage(await compressImage(file))
  }

  async function handleSave() {
    if (!name.trim() || modules.length === 0) return
    setSaving(true)
    await updateGoal(goal.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      coverImage,
      modules,
    })
    setSaving(false)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Edit goal</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Cover image (optional)
            <input type="file" accept="image/*" onChange={handleFile} className="mt-1 block w-full text-sm" />
          </label>
          {coverImage && <img src={coverImage} alt="" className="h-24 w-full rounded-lg object-cover" />}
        </div>

        <div className="mt-4">
          <p className="text-sm opacity-70">Modules</p>
          <div className="mt-2">
            <ModuleToggles modules={modules} onChange={setModules} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || modules.length === 0}
            className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
