import * as SQLite from 'expo-sqlite'
import type { SqlDriver, SqlRunResult, SqlValue } from '@aerofms/shared'

/**
 * SqlDriver on top of expo-sqlite (on-device SQLite file). The same migrations and
 * repositories as the web app run on it.
 */
export class ExpoSqliteDriver implements SqlDriver {
  private depth = 0
  private lock: Promise<void> = Promise.resolve()

  constructor(readonly db: SQLite.SQLiteDatabase) {}

  async exec(sql: string): Promise<void> {
    await this.db.execAsync(sql)
  }

  async run(sql: string, params: SqlValue[] = []): Promise<SqlRunResult> {
    const r = await this.db.runAsync(sql, params as SQLite.SQLiteBindParams)
    return { changes: r.changes }
  }

  async all<T = Record<string, SqlValue>>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, params as SQLite.SQLiteBindParams)
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.depth > 0) {
      this.depth++
      try {
        return await fn()
      } finally {
        this.depth--
      }
    }
    // Serialise top-level transactions.
    const previous = this.lock
    let release!: () => void
    this.lock = new Promise<void>((r) => (release = r))
    await previous
    this.depth = 1
    await this.db.execAsync('BEGIN')
    try {
      const result = await fn()
      await this.db.execAsync('COMMIT')
      return result
    } catch (e) {
      await this.db.execAsync('ROLLBACK').catch(() => undefined)
      throw e
    } finally {
      this.depth = 0
      release()
    }
  }
}

export const DB_NAME = 'aerofms.db'

export async function openDeviceDatabase(): Promise<{ driver: ExpoSqliteDriver; recovered: boolean }> {
  let recovered = false
  let db: SQLite.SQLiteDatabase
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME)
    await db.execAsync('PRAGMA journal_mode = WAL')
    const check = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check')
    if (check && check.integrity_check !== 'ok') throw new Error('integrity_check failed')
  } catch {
    // The file cannot be opened or failed the integrity check: start over with a fresh database.
    recovered = true
    try {
      await SQLite.deleteDatabaseAsync(DB_NAME)
    } catch {
      // ignore
    }
    db = await SQLite.openDatabaseAsync(DB_NAME)
  }
  return { driver: new ExpoSqliteDriver(db), recovered }
}

export async function destroyDeviceDatabase(driver: ExpoSqliteDriver): Promise<void> {
  await driver.db.closeAsync().catch(() => undefined)
  await SQLite.deleteDatabaseAsync(DB_NAME)
}
