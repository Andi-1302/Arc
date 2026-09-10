import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { restoreFromBackupJson } from './backup'
import { BACKUP_VERSION } from './backupMigrations'

// A real 1x1 PNG as a data URL. Small, but enough that decoding it is a `fetch()`.
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function backupJson(): string {
  return JSON.stringify({
    version: BACKUP_VERSION,
    exportedAt: '2026-09-10T00:00:00.000Z',
    data: {
      // db.tables yields `photos` before `settings`/`todos`, so a photo decode that
      // stalls the transaction is exactly what strands every table after it.
      photos: [{ id: 'p1', goalId: null, date: '2026-09-01', blob: PNG_DATA_URL }],
      settings: [
        {
          id: 'settings',
          dailyQuestion: 'What mattered today?',
          newCardsPerDay: 10,
          dueCardsPerDay: 40,
          hideRoutineChecklist: false,
        },
      ],
      todos: [
        { id: 't1', title: 'First', done: false, createdAt: '2026-09-01T00:00:00.000Z' },
        { id: 't2', title: 'Second', done: true, createdAt: '2026-09-02T00:00:00.000Z' },
        { id: 't3', title: 'Third', done: false, createdAt: '2026-09-03T00:00:00.000Z' },
      ],
    },
  })
}

const realFetch = globalThis.fetch

beforeEach(async () => {
  // A real photo blob is megabytes; decoding it via fetch() is not instantaneous.
  // This tiny delay just makes that non-zero window deterministic: while the restore
  // awaits it, an IndexedDB transaction left open around the decode has nothing to do
  // and auto-commits. Without the delay the test env is fast enough to hide the bug.
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    new Promise((resolve) => setTimeout(resolve, 5)).then(() =>
      realFetch(input, init),
    )) as typeof fetch

  await db.delete()
  await db.open()
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('restoreFromBackupJson', () => {
  it('repopulates every table when the backup contains a photo', async () => {
    // The bug shows up as either a thrown TransactionInactiveError or a silently
    // truncated restore, depending on timing — both are data loss, so assert on the
    // final DB state.
    await restoreFromBackupJson(backupJson()).catch(() => {})

    expect(await db.photos.count()).toBe(1)
    expect(await db.settings.count()).toBe(1)
    expect(await db.todos.count()).toBe(3)
  })
})
