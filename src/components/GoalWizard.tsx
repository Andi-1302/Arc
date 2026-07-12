import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Area, Module } from '../db'
import { createGoal } from '../lib/actions'
import { compressImage } from '../lib/image'
import AreaFormSheet from './AreaFormSheet'
import ModuleToggles from './ModuleToggles'

export default function GoalWizard({ areas, onClose }: { areas: Area[]; onClose: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [areaId, setAreaId] = useState<string | undefined>(areas[0]?.id)
  const [newAreaOpen, setNewAreaOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState<string | undefined>()
  const [modules, setModules] = useState<Module[]>(['metrics', 'milestones'])
  const [saving, setSaving] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverImage(await compressImage(file))
  }

  async function handleCreate() {
    if (!areaId || !name.trim() || modules.length === 0) return
    setSaving(true)
    const id = await createGoal({
      areaId,
      name: name.trim(),
      description: description.trim() || undefined,
      coverImage,
      modules,
    })
    setSaving(false)
    onClose()
    navigate(`/goals/${id}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">New goal — step {step} of 3</h3>
          <button type="button" onClick={onClose} className="text-sm opacity-60">
            Close
          </button>
        </div>

        {step === 1 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm opacity-70">Pick an area.</p>
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setAreaId(area.id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                  areaId === area.id ? 'border-accent bg-accent/5' : 'border-black/10'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                {area.name}
              </button>
            ))}
            <button type="button" onClick={() => setNewAreaOpen(true)} className="text-sm font-medium text-accent">
              + New area
            </button>
          </div>
        )}

        {step === 2 && (
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
        )}

        {step === 3 && (
          <div className="mt-3">
            <p className="text-sm opacity-70">Toggle the modules this goal needs.</p>
            <div className="mt-2">
              <ModuleToggles modules={modules} onChange={setModules} />
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-lg border border-black/10 py-2 text-sm"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !areaId) || (step === 2 && !name.trim())}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || modules.length === 0}
              className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Create goal
            </button>
          )}
        </div>
      </div>

      {newAreaOpen && <AreaFormSheet onClose={() => setNewAreaOpen(false)} onSaved={(id) => setAreaId(id)} />}
    </div>,
    document.body,
  )
}
