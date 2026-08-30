import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { todosForToday } from '../lib/todos'
import { useToday } from '../lib/useToday'
import { createTodo, toggleTodo } from '../lib/actions'

export default function TodayTodos({ date }: { date: string }) {
  const realToday = useToday()
  const today = date
  const todos = useLiveQuery(() => db.todos.toArray())
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setAdding(true)
    // On a back-dated day, pin the new todo to that day so it belongs there; on today, leave it open-ended.
    await createTodo({ title: title.trim(), dueDate: date === realToday ? undefined : date })
    setTitle('')
    setAdding(false)
  }

  if (!todos) return null

  const items = todosForToday(todos, today)

  return (
    <div className="px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Todos</h2>

      <div className="mt-2 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="Quick-add a todo"
          className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !title.trim()}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">Nothing due.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {items.map((todo) => {
            const overdue = todo.dueDate && todo.dueDate < today
            return (
              <li key={todo.id} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => toggleTodo(todo.id, true)}
                  aria-pressed={false}
                  aria-label={`Complete ${todo.title}`}
                  className="h-6 w-6 shrink-0 rounded-full border-2 border-ink/30"
                />
                <span className="flex-1">{todo.title}</span>
                {todo.dueDate && (
                  <span className={`shrink-0 text-xs tabular-nums ${overdue ? 'font-medium text-warning' : 'opacity-50'}`}>
                    {overdue ? 'Overdue' : 'Today'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
