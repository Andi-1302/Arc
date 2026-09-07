import { useState } from 'react'
import { createTodo } from '../lib/actions'

/** Single-line quick capture: type a title, press Enter, done — no sheet. */
export default function AddForTomorrow({ tomorrow }: { tomorrow: string }) {
  const [title, setTitle] = useState('')

  async function handleAdd() {
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    await createTodo({ title: trimmed, dueDate: tomorrow })
  }

  return (
    <input
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleAdd()
      }}
      placeholder="Add for tomorrow"
      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
    />
  )
}
