import type { Todo } from '../db'

/** Todos shown on Today: open, and due today, overdue, or with no due date at all. */
export function todosForToday(todos: Todo[], today: string): Todo[] {
  return todos
    .filter((t) => !t.done && (!t.dueDate || t.dueDate <= today))
    .sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
}
