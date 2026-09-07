import { describe, expect, it } from 'vitest'
import type { Todo } from '../db'
import { sortTodos } from './todos'

function todo(patch: Partial<Todo> & Pick<Todo, 'id' | 'title'>): Todo {
  return { done: false, createdAt: '2026-01-01T00:00:00.000Z', ...patch }
}

describe('sortTodos', () => {
  it('sorts by priority descending, then sortOrder, then title', () => {
    const todos = [
      todo({ id: 'a', title: 'Zeta', priority: 0, sortOrder: 2 }),
      todo({ id: 'b', title: 'Alpha urgent', priority: 2, sortOrder: 1 }),
      todo({ id: 'c', title: 'Beta urgent', priority: 2, sortOrder: 0 }),
      todo({ id: 'd', title: 'Important task', priority: 1, sortOrder: 0 }),
    ]
    expect(sortTodos(todos).map((t) => t.id)).toEqual(['c', 'b', 'd', 'a'])
  })

  it('treats todos with no priority or sortOrder as priority 0, sortOrder 0', () => {
    const todos = [
      todo({ id: 'legacy', title: 'Legacy todo (no priority/sortOrder fields)' }),
      todo({ id: 'urgent', title: 'Urgent todo', priority: 2, sortOrder: 5 }),
      // Same priority/sortOrder as the legacy row's defaults (0/0) but a later title.
      todo({ id: 'normal-tie', title: 'Zzz normal, ties with legacy on priority+sortOrder' }),
    ]
    const result = sortTodos(todos).map((t) => t.id)
    expect(result[0]).toBe('urgent') // priority 2 beats everything
    expect(result.slice(1)).toEqual(['legacy', 'normal-tie']) // both default to 0/0, so title breaks the tie
  })

  it('falls back to title alphabetically within equal priority and sortOrder', () => {
    const todos = [
      todo({ id: 'b', title: 'Banana', priority: 0, sortOrder: 0 }),
      todo({ id: 'a', title: 'Apple', priority: 0, sortOrder: 0 }),
    ]
    expect(sortTodos(todos).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the input array', () => {
    const todos = [todo({ id: 'b', title: 'B' }), todo({ id: 'a', title: 'A' })]
    const original = [...todos]
    sortTodos(todos)
    expect(todos).toEqual(original)
  })
})
