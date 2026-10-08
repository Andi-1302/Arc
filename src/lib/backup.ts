import Dexie, { type BulkError } from 'dexie'
import { db } from '../db'
import { BACKUP_VERSION, migrateBackupData, type BackupData } from './backupMigrations'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

/**
 * Decodes a `data:` URL back into a Blob, synchronously. Deliberately does NOT go
 * through `fetch(dataUrl).then(r => r.blob())` (the previous implementation): WebKit's
 * IndexedDB can't structured-clone-store a Blob built that way — `photos.bulkAdd()`
 * throws "Error preparing Blob/File data to be stored in object store" on Safari/iOS,
 * even though the exact same backup imports fine on Chromium. Plain `atob` + a manual
 * byte array + the `Blob` constructor avoids whatever internal representation WebKit's
 * fetch-produced Blobs get. Being synchronous also means this can't be the thing that
 * leaves a Dexie transaction idle mid-restore (see the comment in restoreFromBackupJson).
 */
export function base64ToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl)
  if (!match) throw new Error('not a base64 data URL')
  const [, mime, b64] = match
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Full DB dump (spec §8.4) — every Dexie table, with photo blobs base64-encoded so the whole thing is one JSON file. */
export async function buildBackupJson(): Promise<string> {
  const data: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    const rows = await table.toArray()
    data[table.name] =
      table.name === 'photos'
        ? await Promise.all(rows.map(async (r) => ({ ...r, blob: await blobToBase64(r.blob) })))
        : rows
  }
  return JSON.stringify({ version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }, null, 2)
}

/**
 * Structural validation over the migrated backup payload, run before anything touches
 * the DB. Every table's primary key field comes straight from Dexie's own schema
 * (`table.schema.primKey.keyPath`) so this can't drift from reality. Every table here
 * has a simple string primary key — none compound — but this throws clearly instead of
 * silently misbehaving if that ever changes.
 */
function validateBackupShape(data: BackupData): void {
  for (const table of db.tables) {
    const rows = data[table.name]
    if (!Array.isArray(rows)) continue

    const keyPath = table.schema.primKey.keyPath
    if (typeof keyPath !== 'string') {
      throw new Error(
        `Backup validation doesn't support table "${table.name}": its primary key isn't a single field.`,
      )
    }

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Backup is invalid: table "${table.name}", record ${index} — not a plain object.`)
      }
      const value = (row as Record<string, unknown>)[keyPath]
      if (value === undefined || value === null || value === '') {
        throw new Error(
          `Backup is invalid: table "${table.name}", record ${index} — missing "${keyPath}" (primary key).`,
        )
      }
    })
  }
}

/** Builds a message naming every row a `bulkAdd` rejected, by original array index and primary-key value. */
function describeBulkError(
  tableName: string,
  rows: readonly unknown[],
  keyPath: string,
  error: BulkError,
): string {
  // failuresByPos is keyed by the row's position in the array passed to bulkAdd — unlike
  // `failures` (also on this error), which Dexie re-indexes from 0 and so does NOT line
  // up with the original rows (confirmed against this repo's installed Dexie version).
  const byPos = error.failuresByPos ?? {}
  const parts = Object.keys(byPos)
    .map(Number)
    .sort((a, b) => a - b)
    .map((index) => {
      const row = rows[index]
      const value = row && typeof row === 'object' ? (row as Record<string, unknown>)[keyPath] : undefined
      const idPart = value === undefined || value === null || value === '' ? '' : ` (${keyPath}=${String(value)})`
      return `record ${index}${idPart} — ${byPos[index].message}`
    })
  return `Backup is invalid: table "${tableName}", ${parts.join('; ')}`
}

/** `table.bulkAdd`, but a `Dexie.BulkError` is re-thrown with a message naming the table/record/reason. */
async function bulkAddChecked(table: (typeof db.tables)[number], rows: readonly unknown[], keyPath: string) {
  try {
    await table.bulkAdd(rows)
  } catch (err) {
    if (err instanceof Dexie.BulkError) {
      throw new Error(describeBulkError(table.name, rows, keyPath, err))
    }
    throw err
  }
}

/**
 * Replace-all restore: reads the backup's format version, upgrades its contents to the
 * current format, then (and only then) wipes every table and repopulates from it.
 * Photo blobs are decoded back from base64.
 */
export async function restoreFromBackupJson(json: string): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("This file isn't valid JSON.")
  }

  // Migrate before anything touches the DB — a rejected file leaves existing data untouched.
  const data = migrateBackupData(parsed)

  // Validate shape before anything touches the DB too — same reason.
  validateBackupShape(data)

  // Decode every photo blob HERE, before db.transaction() opens — do NOT move this inside
  // the callback. Nothing inside the transaction callback may await anything but a Dexie
  // promise: awaiting something foreign between the clear()s and the bulkAdd()s lets the
  // IndexedDB transaction go idle and auto-commit, committing the clears but never
  // repopulating any table after `photos` in db.tables (settings, planEntries, todos,
  // workoutTemplates, workoutSessions) — a silent wipe. base64ToBlob() is synchronous
  // specifically so this step can't reintroduce that.
  const photoRows = Array.isArray(data.photos) ? data.photos : []
  const restoredPhotos = photoRows.map((r, index) => {
    const photo = r as { id?: unknown; blob: string }
    try {
      return { ...photo, blob: base64ToBlob(photo.blob) }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      throw new Error(`Backup is invalid: table "photos", record ${index} (id=${String(photo.id)}) — ${reason}`)
    }
  })

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
    }
    for (const table of db.tables) {
      const keyPath = table.schema.primKey.keyPath as string // validated above
      if (table.name === 'photos') {
        if (restoredPhotos.length > 0) await bulkAddChecked(table, restoredPhotos, keyPath)
        continue
      }
      const rows = data[table.name]
      if (!Array.isArray(rows) || rows.length === 0) continue
      await bulkAddChecked(table, rows, keyPath)
    }
  })
}
