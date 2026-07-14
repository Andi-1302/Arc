import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { toggleTodo } from '../lib/actions'

export default function GoalTodosSection({ goalId }: { goalId: string }) {
  const todos = useLiveQuery(
    () => db.todos.where('goalId').equals(goalId).and((t) => !t.done).toArray(),
    [goalId],
  )

  if (!todos || todos.length === 0) return null

  return (
    <div className="border-t border-black/5 px-4 py-4">
      <h2 className="font-display text-lg font-semibold">Todos</h2>
      <ul className="mt-2 divide-y divide-black/5">
        {todos.map((todo) => (
          <li key={todo.id} className="flex items-center gap-3 py-3">
            <button
              type="button"
              onClick={() => toggleTodo(todo.id, true)}
              aria-pressed={false}
              aria-label={`Complete ${todo.title}`}
              className="h-6 w-6 shrink-0 rounded-full border-2 border-ink/30"
            />
            <span className="flex-1">{todo.title}</span>
            {todo.dueDate && <span className="shrink-0 text-xs tabular-nums opacity-50">{todo.dueDate}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
