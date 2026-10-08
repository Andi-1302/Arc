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
})
