/// <reference types="node" />
import 'fake-indexeddb/auto'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { base64ToBlob, restoreFromBackupJson } from './backup'
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

async function tableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const table of db.tables) {
    counts[table.name] = await table.count()
  }
  return counts
}

describe('base64ToBlob', () => {
  it('round-trips a byte sequence through a data: URL', async () => {
    const bytes = new Uint8Array([0, 1, 2, 16, 127, 128, 254, 255])
    const dataUrl = `data:application/octet-stream;base64,${Buffer.from(bytes).toString('base64')}`

    const blob = base64ToBlob(dataUrl)

    expect(blob.type).toBe('application/octet-stream')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
  })
})

describe('restoreFromBackupJson validation', () => {
  it('rejects a record missing its primary key before touching the DB, and leaves existing data untouched', async () => {
    await db.todos.add({ id: 'pre-existing', title: 'Pre-existing', done: false, createdAt: '2026-01-01T00:00:00.000Z' })
    const before = await tableCounts()

    const json = JSON.stringify({
      version: BACKUP_VERSION,
      exportedAt: '2026-09-10T00:00:00.000Z',
      data: {
        todos: [
          { id: 't1', title: 'Fine', done: false, createdAt: '2026-09-01T00:00:00.000Z' },
          // Index 1 has no `id` — the structural validation pass must catch this before
          // db.transaction() ever opens, so nothing below gets touched.
          { title: 'Missing its id', done: false, createdAt: '2026-09-02T00:00:00.000Z' },
        ],
      },
    })

    let caught: unknown
    try {
      await restoreFromBackupJson(json)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(Error)
    const message = (caught as Error).message
    expect(message).toContain('"todos"')
    expect(message).toContain('record 1')
    expect(message).toMatch(/missing/i)

    expect(await tableCounts()).toEqual(before)
    expect(await db.todos.get('pre-existing')).toBeDefined()
  })

  it('rejects a bulkAdd constraint violation and rolls back the whole transaction, leaving existing data untouched', async () => {
    await db.routineChecks.add({ id: 'pre-existing', routineId: 'rX', date: '2026-01-01', done: false })
    const before = await tableCounts()

    const json = JSON.stringify({
      version: BACKUP_VERSION,
      exportedAt: '2026-09-10T00:00:00.000Z',
      data: {
        // Both rows pass structural validation (every row has an id) but share the same
        // [routineId+date], which violates routineChecks' unique compound index — unlike
        // the WebKit Blob-storage bug, bulkAdd rejects this even under fake-indexeddb.
        routineChecks: [
          { id: 'rc1', routineId: 'r1', date: '2026-09-01', done: false },
          { id: 'rc2', routineId: 'r1', date: '2026-09-01', done: true },
        ],
      },
    })

    let caught: unknown
    try {
      await restoreFromBackupJson(json)
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(Error)
    const message = (caught as Error).message
    expect(message).toContain('"routineChecks"')
    expect(message).toContain('record 1')
    expect(message).toContain('rc2')

    expect(await tableCounts()).toEqual(before)
    expect(await db.routineChecks.get('pre-existing')).toBeDefined()
  })
})

// Real backup used to reproduce a WebKit-only import bug (see e2e/backup-webkit-blob.spec.ts).
// Gitignored (/private-fixtures/) and absent in CI, so this test skips rather than fails there.
// NOTE: fake-indexeddb runs in Node and does NOT reproduce WebKit's Blob-storage quirk — this
// only proves the restore logic (validation + base64 decode + table repopulation) is correct
// for a real, large, multi-table backup. It can't catch the WebKit-specific storage failure.
const REAL_FIXTURE = path.resolve(process.cwd(), 'private-fixtures', 'blocks-backup-2026-08-31.json')

describe('restoreFromBackupJson (real fixture)', () => {
  it.skipIf(!fs.existsSync(REAL_FIXTURE))(
    "imports the real backup with every table's row count matching the source file",
    async () => {
      const json = fs.readFileSync(REAL_FIXTURE, 'utf-8')
      const sourceData = (JSON.parse(json) as { data: Record<string, unknown> }).data

      await restoreFromBackupJson(json)

      for (const table of db.tables) {
        const rows = sourceData[table.name]
        const expectedCount = Array.isArray(rows) ? rows.length : 0
        expect(await table.count()).toBe(expectedCount)
      }
    },
  )
})
