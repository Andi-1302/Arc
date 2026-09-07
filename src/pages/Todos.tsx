import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Todo } from '../db'
import { useToday } from '../lib/useToday'
import { addDays } from '../lib/date'
import { sectionTodos } from '../lib/todos'
import { setTodoDueDate, toggleTodo } from '../lib/actions'
import TodoFormSheet from '../components/TodoFormSheet'

function TodoRow({
  todo,
  goalName,
  areaName,
  today,
  tomorrow,
  showMove,
}: {
  todo: Todo
  goalName?: string
  areaName?: string
  today: string
  tomorrow: string
  showMove?: boolean
}) {
  const [editing, setEditing] = useState(false)

  const priorityLabel = todo.priority === 2 ? 'Urgent' : todo.priority === 1 ? 'Important' : null

  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => toggleTodo(todo.id, !todo.done)}
        aria-pressed={todo.done}
        aria-label={`${todo.done ? 'Reopen' : 'Complete'} ${todo.title}`}
        className={`h-6 w-6 shrink-0 rounded-full border-2 ${todo.done ? 'border-accent bg-accent' : 'border-ink/30'}`}
      />
      <button type="button" onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left">
        <span className={`block truncate ${todo.done ? 'line-through opacity-50' : ''}`}>{todo.title}</span>
        {(todo.dueDate || goalName || areaName || priorityLabel) && (
          <span className="mt-0.5 block text-xs opacity-60">
            {priorityLabel && (
              <span className={`mr-1 font-medium ${todo.priority === 2 ? 'text-warning' : 'text-accent'}`}>
                {priorityLabel}
              </span>
            )}
            {[todo.dueDate, goalName, areaName].filter(Boolean).join(' · ')}
          </span>
        )}
      </button>
      {showMove && !todo.done && (
        <span className="flex shrink-0 gap-2 text-xs font-medium text-accent">
          <button type="button" onClick={() => setTodoDueDate(todo.id, today)}>
            Today
          </button>
          <button type="button" onClick={() => setTodoDueDate(todo.id, tomorrow)}>
            Tomorrow
          </button>
        </span>
      )}
      {editing && <TodoFormSheet todo={todo} onClose={() => setEditing(false)} />}
    </li>
  )
}

function TodoSection({
  title,
  items,
  emptyText,
  goalNames,
  areaNames,
  today,
  tomorrow,
  showMove,
}: {
  title: string
  items: Todo[]
  emptyText: string
  goalNames: Map<string, string>
  areaNames: Map<string, string>
  today: string
  tomorrow: string
  showMove?: boolean
}) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm opacity-60">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {items.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              goalName={todo.goalId ? goalNames.get(todo.goalId) : undefined}
              areaName={todo.areaId ? areaNames.get(todo.areaId) : undefined}
              today={today}
              tomorrow={tomorrow}
              showMove={showMove}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Todos() {
  const today = useToday()
  const tomorrow = addDays(today, 1)
  const todos = useLiveQuery(() => db.todos.toArray())
  const goals = useLiveQuery(() => db.goals.toArray())
  const areas = useLiveQuery(() => db.areas.toArray())

  if (!todos || !goals || !areas) return null

  const goalNames = new Map(goals.map((g) => [g.id, g.name]))
  const areaNames = new Map(areas.map((a) => [a.id, a.name]))
  const sections = sectionTodos(todos, today)

  const shared = { goalNames, areaNames, today, tomorrow }

  return (
    <div className="p-4 pb-8">
      <Link to="/more" className="text-sm font-medium text-accent">
        ‹ More
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold">Todos</h1>

      <TodoSection title="Overdue" items={sections.overdue} emptyText="Nothing overdue." {...shared} />
      <TodoSection title="Today" items={sections.today} emptyText="Nothing due today." {...shared} />
      <TodoSection title="Tomorrow" items={sections.tomorrow} emptyText="Nothing due tomorrow." {...shared} />
      <TodoSection
        title="Someday"
        items={sections.someday}
        emptyText="No someday todos."
        showMove
        {...shared}
      />
      <TodoSection title="Done" items={sections.done} emptyText="No completed todos yet." {...shared} />
    </div>
  )
}
