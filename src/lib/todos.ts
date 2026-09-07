import type { Todo } from '../db'

/**
 * Priority-first ordering: urgent → important → normal, then manual sortOrder, then title.
 * Rows created before priority/sortOrder existed have neither — they default to normal
 * priority and sortOrder 0, same as a freshly created todo nobody has reordered yet.
 */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const byPriority = (b.priority ?? 0) - (a.priority ?? 0)
    if (byPriority !== 0) return byPriority
    const bySortOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    if (bySortOrder !== 0) return bySortOrder
    return a.title.localeCompare(b.title)
  })
}

/**
 * Todos shown on Today: open items due today, overdue, or with no due date at all — plus
 * anything finished today, so completing one doesn't yank it out from under the user mid-day.
 * It stays visible (checked) for the rest of the day it was done, then drops off the next.
 */
export function todosForToday(todos: Todo[], today: string): Todo[] {
  return sortTodos(todos.filter((t) => (!t.done && (!t.dueDate || t.dueDate <= today)) || t.doneAt === today))
}

export interface TodoSections {
  overdue: Todo[]
  today: Todo[]
  tomorrow: Todo[]
  someday: Todo[]
  done: Todo[]
}

/**
 * Buckets every todo for the full Todos page. There's no dedicated "later" section, so a
 * dueDate further out than tomorrow still groups under Tomorrow rather than disappearing.
 */
export function sectionTodos(todos: Todo[], today: string): TodoSections {
  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)
  return {
    overdue: sortTodos(open.filter((t) => t.dueDate !== undefined && t.dueDate < today)),
    today: sortTodos(open.filter((t) => t.dueDate === today)),
    tomorrow: sortTodos(open.filter((t) => t.dueDate !== undefined && t.dueDate > today)),
    someday: sortTodos(open.filter((t) => t.dueDate === undefined)),
    done: [...done].sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
  }
}
