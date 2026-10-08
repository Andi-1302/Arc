/// <reference types="node" />
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, SETTINGS_ID } from '../db'
import { updateSettings } from './actions'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('updateSettings', () => {
  it('does not lose a concurrent patch to a different field (read-modify-write must be atomic)', async () => {
    // Both calls read the same pre-existing settings row. Without the read+write wrapped
    // in a single transaction, both `get()`s can resolve against the same stale snapshot
    // before either `put()` commits, so whichever `put()` lands last silently clobbers the
    // other call's patch — reproducing the lost-update race from Settings.tsx (a checkbox's
    // unbuffered onChange firing while another field's blur-triggered call is in flight).
    await Promise.all([
      updateSettings({ dailyQuestion: 'Concurrent A?' }),
      updateSettings({ hideRoutineChecklist: true }),
    ])

    const settings = await db.settings.get(SETTINGS_ID)
    expect(settings?.dailyQuestion).toBe('Concurrent A?')
    expect(settings?.hideRoutineChecklist).toBe(true)
  })

  it('creates the row (self-healing) when both concurrent calls run against a missing settings row', async () => {
    await db.settings.delete(SETTINGS_ID)

    await Promise.all([
      updateSettings({ dailyQuestion: 'Concurrent B?' }),
      updateSettings({ newCardsPerDay: 7 }),
    ])

    const settings = await db.settings.get(SETTINGS_ID)
    expect(settings?.dailyQuestion).toBe('Concurrent B?')
    expect(settings?.newCardsPerDay).toBe(7)
  })
})
