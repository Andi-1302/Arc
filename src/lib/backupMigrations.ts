/**
 * Backup-file format versioning. This is deliberately separate from the Dexie
 * schema version: a backup can be restored into a newer app, so its contents may
 * need upgrading before they touch the DB. Keeping the migration mechanism here
 * (pure, no DB import) means a future format change is one appended step, not a
 * rewrite of restore — and it stays unit-testable.
 */
export const BACKUP_VERSION = 1

export type BackupData = Record<string, unknown[]>

/** One step: transforms parsed backup `data` from version `from` to version `from + 1`. */
export interface BackupMigration {
  readonly from: number
  migrate(data: BackupData): BackupData
}

/**
 * Ordered migrations from older backup formats up to BACKUP_VERSION. Empty while
 * BACKUP_VERSION is 1 — the mechanism exists so the first format change is safe.
 */
export const BACKUP_MIGRATIONS: readonly BackupMigration[] = []

/**
 * Validates a parsed backup envelope and runs every migration needed to bring it
 * up to `targetVersion`, returning the current-format table data. Throws a
 * user-facing message for anything it can't restore. Never touches the database.
 *
 * `migrations` / `targetVersion` are injectable so the mechanism can be unit-tested
 * without the (currently empty) real migration chain.
 */
export function migrateBackupData(
  parsed: unknown,
  migrations: readonly BackupMigration[] = BACKUP_MIGRATIONS,
  targetVersion: number = BACKUP_VERSION,
): BackupData {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error("This file doesn't look like a Blocks backup.")
  }

  const envelope = parsed as { version?: unknown; data?: unknown }
  // Backups have carried a `version` since the first release; a missing one means the current format.
  const version = typeof envelope.version === 'number' ? envelope.version : targetVersion

  if (version > targetVersion) {
    throw new Error(
      `This backup was made by a newer version of Blocks (backup format v${version}); this app only understands up to v${targetVersion}. Update the app, then import again.`,
    )
  }

  if (!envelope.data || typeof envelope.data !== 'object') {
    throw new Error("This file doesn't look like a Blocks backup.")
  }

  let data = envelope.data as BackupData
  for (let v = version; v < targetVersion; v++) {
    const step = migrations.find((m) => m.from === v)
    if (!step) {
      throw new Error(`This backup (format v${version}) can't be upgraded to v${targetVersion}.`)
    }
    data = step.migrate(data)
  }
  return data
}
