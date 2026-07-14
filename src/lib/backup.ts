import { db } from '../db'

const BACKUP_VERSION = 1

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

/** Replace-all restore: wipes every table, then repopulates from the backup. Photo blobs are decoded back from base64. */
export async function restoreFromBackupJson(json: string): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("This file isn't valid JSON.")
  }

  const data = (parsed as { data?: Record<string, unknown[]> } | null)?.data
  if (!data || typeof data !== 'object') {
    throw new Error("This file doesn't look like a Blocks backup.")
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
    }
    for (const table of db.tables) {
      const rows = data[table.name]
      if (!Array.isArray(rows) || rows.length === 0) continue
      if (table.name === 'photos') {
        const restored = await Promise.all(
          rows.map(async (r) => {
            const photo = r as { blob: string }
            return { ...photo, blob: await base64ToBlob(photo.blob) }
          }),
        )
        await table.bulkAdd(restored)
      } else {
        await table.bulkAdd(rows)
      }
    }
  })
}
