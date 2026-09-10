import { db } from '../db'
import { BACKUP_VERSION, migrateBackupData } from './backupMigrations'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

async function base64ToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
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

  // Decode every photo blob HERE, before db.transaction() opens — do NOT move this inside
  // the callback. base64ToBlob() awaits fetch(), which is not a Dexie promise; awaiting it
  // between the clear()s and the bulkAdd()s lets the IndexedDB transaction go idle and
  // auto-commit, committing the clears but never repopulating any table after `photos`
  // in db.tables (settings, planEntries, todos, workoutTemplates, workoutSessions) — a
  // silent wipe. Nothing inside the callback may await anything but a Dexie promise.
  const photoRows = Array.isArray(data.photos) ? data.photos : []
  const restoredPhotos = await Promise.all(
    photoRows.map(async (r) => {
      const photo = r as { blob: string }
      return { ...photo, blob: await base64ToBlob(photo.blob) }
    }),
  )

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
    }
    for (const table of db.tables) {
      if (table.name === 'photos') {
        if (restoredPhotos.length > 0) await table.bulkAdd(restoredPhotos)
        continue
      }
      const rows = data[table.name]
      if (!Array.isArray(rows) || rows.length === 0) continue
      await table.bulkAdd(rows)
    }
  })
}
