import { describe, expect, it } from 'vitest'
import { reorderIds } from './useReorderableList'

describe('reorderIds', () => {
  it('drops the dragged item right after the target when dragging downward', () => {
    // AAA dragged down until the pointer is past CCC's midpoint (but still within CCC's
    // row, nowhere near DDD) — handlePointerMove's scan lands on targetIndex 3 (DDD's
    // index in the pre-removal array) in that case. The item should end up right after
    // CCC, not past DDD.
    const current = ['AAA', 'BBB', 'CCC', 'DDD']
    expect(reorderIds(current, 'AAA', 3)).toEqual(['BBB', 'CCC', 'AAA', 'DDD'])
  })

  it('drops the dragged item right before the target when dragging upward', () => {
    // DDD dragged up onto the top quarter of BBB's row — targetIndex 1 (BBB's index).
    const current = ['AAA', 'BBB', 'CCC', 'DDD']
    expect(reorderIds(current, 'DDD', 1)).toEqual(['AAA', 'DDD', 'BBB', 'CCC'])
  })

  it('moves the dragged item to the end when the pointer is past every item', () => {
    // AAA dragged down past BBB's midpoint entirely (or off the bottom of the window) —
    // handlePointerMove's scan loop never breaks, so targetIndex defaults to
    // current.length (2), one past the last valid index. AAA should end up last, not
    // stay in place.
    const current = ['AAA', 'BBB']
    expect(reorderIds(current, 'AAA', 2)).toEqual(['BBB', 'AAA'])
  })

  it('appends to the end from any starting position, not just second-to-last', () => {
    // Same "pointer past everything" case as above but with more items, to confirm the
    // insertion lands at the very end regardless of draggedIndex.
    const current = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']
    expect(reorderIds(current, 'AAA', 5)).toEqual(['BBB', 'CCC', 'DDD', 'EEE', 'AAA'])
  })

  it('is a no-op when the target is the dragged item itself', () => {
    const current = ['AAA', 'BBB', 'CCC']
    expect(reorderIds(current, 'BBB', 1)).toEqual(['AAA', 'BBB', 'CCC'])
  })
})
