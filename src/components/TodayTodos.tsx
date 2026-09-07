import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Todo } from '../db'
import { todosForToday } from '../lib/todos'
import { useToday } from '../lib/useToday'
import { addDays } from '../lib/date'
import { createTodo, reorderTodos, setTodoPriority, toggleTodo } from '../lib/actions'
import { useReorderableList } from '../lib/useReorderableList'
import PriorityChips from './PriorityChips'
import AddForTomorrow from './AddForTomorrow'

export default function TodayTodos({ date }: { date: string }) {
  const realToday = useToday()
  const today = date
  const tomorrow = addDays(date, 1)
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

  const items = todos ? todosForToday(todos, today) : []
  const { order, registerRef, handlePointerDown } = useReorderableList(items, reorderTodos)
  const byId = new Map(items.map((t) => [t.id, t]))
  const ordered = order.map((id) => byId.get(id)).filter((t): t is Todo => t !== undefined)

  if (!todos) return null

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

      <div className="mt-2">
        <AddForTomorrow tomorrow={tomorrow} />
      </div>

      {ordered.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">Nothing due.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {ordered.map((todo) => {
            const overdue = !todo.done && Boolean(todo.dueDate && todo.dueDate < today)
            return (
              <li
                key={todo.id}
                ref={(el) => registerRef(todo.id, el)}
                className="flex items-start gap-2 py-3"
              >
                <span
                  aria-label={`Drag to reorder ${todo.title}`}
                  onPointerDown={(e) => handlePointerDown(todo.id, e)}
                  className="mt-1 shrink-0 cursor-grab touch-none select-none px-1 text-sm leading-none opacity-40"
                >
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => toggleTodo(todo.id, !todo.done)}
                  aria-pressed={todo.done}
                  aria-label={`${todo.done ? 'Reopen' : 'Complete'} ${todo.title}`}
                  className={`mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 ${todo.done ? 'border-accent bg-accent' : 'border-ink/30'}`}
                />
                <div className="min-w-0 flex-1">
                  <span className={`block truncate ${todo.done ? 'line-through opacity-50' : ''}`}>{todo.title}</span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {overdue && (
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                        Overdue
                      </span>
                    )}
                    <PriorityChips value={todo.priority ?? 0} onChange={(p) => setTodoPriority(todo.id, p)} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
