import { describe, expect, it } from 'vitest'
import { BACKUP_VERSION, type BackupData, type BackupMigration, migrateBackupData } from './backupMigrations'

const sampleData = {
  areas: [{ id: 'a1', name: 'Sport', color: '#000000', sortOrder: 0 }],
  goals: [] as unknown[],
}

describe('migrateBackupData', () => {
  it('passes a current-version backup through unchanged', () => {
    expect(migrateBackupData({ version: BACKUP_VERSION, data: sampleData })).toEqual(sampleData)
  })

  it('treats a missing version field as the current format', () => {
    expect(migrateBackupData({ data: sampleData })).toEqual(sampleData)
  })

  it('rejects a backup from a newer app version', () => {
    expect(() => migrateBackupData({ version: BACKUP_VERSION + 1, data: {} })).toThrow(/newer version/i)
  })

  it('rejects a file that is not an object', () => {
    expect(() => migrateBackupData(null)).toThrow(/Blocks backup/i)
    expect(() => migrateBackupData('nope')).toThrow(/Blocks backup/i)
  })

  it('rejects an envelope with no data', () => {
    expect(() => migrateBackupData({ version: BACKUP_VERSION })).toThrow(/Blocks backup/i)
  })

  it('runs injected migration steps in order up to the target version', () => {
    const trail: string[] = []
    const migrations: BackupMigration[] = [
      {
        from: 1,
        migrate: (d: BackupData) => {
          trail.push('1->2')
          return d
        },
      },
      {
        from: 2,
        migrate: (d: BackupData) => {
          trail.push('2->3')
          return d
        },
      },
    ]
    migrateBackupData({ version: 1, data: sampleData }, migrations, 3)
    expect(trail).toEqual(['1->2', '2->3'])
  })

  it('rejects when the injected chain has a gap', () => {
    const migrations: BackupMigration[] = [{ from: 2, migrate: (d: BackupData) => d }]
    expect(() => migrateBackupData({ version: 1, data: sampleData }, migrations, 3)).toThrow(/can't be upgraded/i)
  })
})
