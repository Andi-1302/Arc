import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Todo } from '../db'
import { toggleTodo } from '../lib/actions'
import TodoFormSheet from '../components/TodoFormSheet'

function TodoRow({ todo, goalName }: { todo: Todo; goalName?: string }) {
  const [editing, setEditing] = useState(false)

  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => toggleTodo(todo.id, !todo.done)}
        aria-pressed={todo.done}
        aria-label={`${todo.done ? 'Reopen' : 'Complete'} ${todo.title}`}
        className={`h-6 w-6 shrink-0 rounded-full border-2 ${todo.done ? 'border-accent bg-accent' : 'border-ink/30'}`}
      />
      <button type="button" onClick={() => setEditing(true)} className="flex-1 text-left">
        <span className={`block ${todo.done ? 'line-through opacity-50' : ''}`}>{todo.title}</span>
        {(todo.dueDate || goalName) && (
          <span className="mt-0.5 block text-xs opacity-60">
            {[todo.dueDate, goalName].filter(Boolean).join(' · ')}
          </span>
        )}
      </button>
      {editing && <TodoFormSheet todo={todo} onClose={() => setEditing(false)} />}
    </li>
  )
}

export default function Todos() {
  const todos = useLiveQuery(() => db.todos.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())

  if (!todos || !goals) return null

  const goalNames = new Map(goals.map((g) => [g.id, g.name]))
  const open = [...todos].filter((t) => !t.done).sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
  const done = [...todos].filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  return (
    <div className="p-4 pb-8">
      <Link to="/more" className="text-sm font-medium text-accent">
        ‹ More
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Todos</h1>

      <section className="mt-4">
        <h2 className="font-display text-lg font-semibold">Open</h2>
        {open.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">No open todos.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {open.map((todo) => (
              <TodoRow key={todo.id} todo={todo} goalName={todo.goalId ? goalNames.get(todo.goalId) : undefined} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold">Done</h2>
        {done.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">No completed todos yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {done.map((todo) => (
              <TodoRow key={todo.id} todo={todo} goalName={todo.goalId ? goalNames.get(todo.goalId) : undefined} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
