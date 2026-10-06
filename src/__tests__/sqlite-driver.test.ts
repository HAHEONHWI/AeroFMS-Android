/**
 * Runs the real ExpoSqliteDriver against SQLite (Node's built-in engine standing in for the
 * device), together with the shared migrations, repositories and SessionManager.
 */
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, jest } from '@jest/globals'
import type { SQLiteDatabase } from 'expo-sqlite'
import { KeyValueRepository, migrate, SessionManager } from '@aerofms/core'
import { buildDemoDataset, InMemoryNavigationProvider } from '@aerofms/navigation'
import { createAircraftRegistry } from '@aerofms/aircraft'
import { ExpoSqliteDriver } from '@/platform/db'

jest.mock('expo-sqlite', () => ({}))

type Params = (string | number | null | Uint8Array)[]

/** Minimal async facade with the expo-sqlite methods the driver uses. */
function fakeExpoDb(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:')
  const fake = {
    execAsync: async (sql: string) => {
      db.exec(sql)
    },
    runAsync: async (sql: string, params: Params = []) => {
      const r = db.prepare(sql).run(...params)
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) }
    },
    getAllAsync: async (sql: string, params: Params = []) => db.prepare(sql).all(...params),
  }
  return fake as unknown as SQLiteDatabase
}

describe('ExpoSqliteDriver', () => {
  it('runs every shared migration', async () => {
    const driver = new ExpoSqliteDriver(fakeExpoDb())
    const version = await migrate(driver)
    expect(version).toBeGreaterThanOrEqual(3)
    const tables = (await driver.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'")).map((r) => r.name)
    expect(tables).toEqual(expect.arrayContaining(['kv', 'sessions']))
  })

  it('commits, rolls back and supports nested transactions', async () => {
    const driver = new ExpoSqliteDriver(fakeExpoDb())
    await driver.exec('CREATE TABLE t (v INTEGER)')
    await driver.transaction(async () => {
      await driver.run('INSERT INTO t VALUES (?)', [1])
      await driver.transaction(async () => {
        await driver.run('INSERT INTO t VALUES (?)', [2])
      })
    })
    await expect(
      driver.transaction(async () => {
        await driver.run('INSERT INTO t VALUES (?)', [3])
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    const rows = await driver.all<{ v: number }>('SELECT v FROM t ORDER BY v')
    expect(rows.map((r) => r.v)).toEqual([1, 2])
  })

  it('serialises concurrent top-level transactions', async () => {
    const driver = new ExpoSqliteDriver(fakeExpoDb())
    await driver.exec('CREATE TABLE t (v INTEGER)')
    const order: string[] = []
    const tx = (id: string) =>
      driver.transaction(async () => {
        order.push(`${id}:start`)
        await new Promise((r) => setTimeout(r, 5))
        await driver.run('INSERT INTO t VALUES (?)', [order.length])
        order.push(`${id}:end`)
      })
    await Promise.all([tx('a'), tx('b')])
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end'])
  })

  it('persists and reopens an FMC session through SessionManager', async () => {
    const driver = new ExpoSqliteDriver(fakeExpoDb())
    await migrate(driver)
    const nav = new InMemoryNavigationProvider(buildDemoDataset())
    const registry = createAircraftRegistry()
    const sessions = new SessionManager({ db: driver, nav, registry })
    const engine = await sessions.create('B737-800', 'Test')
    for (const key of ['R', 'K', 'S', 'I']) engine.dispatch({ type: 'KEY', key, t: Date.now() })
    await sessions.saveNow(engine.state)
    const id = engine.state.session.sessionId

    const reopened = new SessionManager({ db: driver, nav, registry })
    const result = await reopened.open(id)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.engine.state.scratchpad.text).toBe('RKSI')
    expect(await new KeyValueRepository(driver).get<string>('sessions.current')).toBe(id)
  })
})
