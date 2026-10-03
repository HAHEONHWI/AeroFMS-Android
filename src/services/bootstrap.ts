import {
  FlightPlanRepository,
  JsonDocumentRepository,
  KeyValueRepository,
  migrate,
  MigrationError,
  ReplayRepository,
  ScenarioAttemptRepository,
  SessionManager,
  SyncOutboxRepository,
  TrainingProgressRepository,
} from '@aerofms/core'
import type { AircraftRegistry } from '@aerofms/core'
import type { SqlDriver } from '@aerofms/shared'
import { buildDemoDataset, importNavDataset, InMemoryNavigationProvider, loadNavDataset, readNavMeta } from '@aerofms/navigation'
import { createAircraftRegistry } from '@aerofms/aircraft'
import { StandaloneSimulator } from '@aerofms/simulation'
import type { Scenario } from '@aerofms/training'
import { openDeviceDatabase } from '@/platform/db'
import type { ExpoSqliteDriver } from '@/platform/db'

export interface AppServices {
  db: ExpoSqliteDriver
  nav: InMemoryNavigationProvider
  registry: AircraftRegistry
  simulator: StandaloneSimulator
  sessions: SessionManager
  kv: KeyValueRepository
  flightPlans: FlightPlanRepository
  progress: TrainingProgressRepository
  scenarios: JsonDocumentRepository<Scenario>
  attempts: ScenarioAttemptRepository
  replays: ReplayRepository
  outbox: SyncOutboxRepository
  recovered: boolean
}

export async function ensureNavDatabase(db: SqlDriver, force = false): Promise<InMemoryNavigationProvider> {
  const bundled = buildDemoDataset()
  const meta = await readNavMeta(db).catch(() => null)
  if (force || !meta || meta.id !== bundled.meta.id || meta.cycle !== bundled.meta.cycle) await importNavDataset(db, bundled)
  try {
    const loaded = await loadNavDataset(db)
    if (loaded && loaded.airports.length) return new InMemoryNavigationProvider(loaded)
  } catch {
    // fall through to re-import
  }
  await importNavDataset(db, bundled)
  return new InMemoryNavigationProvider(bundled)
}

let boot: Promise<AppServices> | undefined

export function bootstrap(): Promise<AppServices> {
  boot ??= doBootstrap()
  return boot
}

async function doBootstrap(): Promise<AppServices> {
  const { driver: db, recovered: dbRecovered } = await openDeviceDatabase()
  let recovered = dbRecovered
  try {
    await migrate(db)
  } catch (e) {
    if (!(e instanceof MigrationError)) throw e
    for (const t of (await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'")).map((r) => r.name)) {
      if (t.startsWith('sqlite_')) continue
      await db.exec(`DROP TABLE IF EXISTS "${t}"`)
    }
    await migrate(db)
    recovered = true
  }
  const nav = await ensureNavDatabase(db)
  const registry = createAircraftRegistry()
  const simulator = new StandaloneSimulator()
  const sessions = new SessionManager({ db, nav, registry, simulator })
  return {
    db,
    nav,
    registry,
    simulator,
    sessions,
    kv: sessions.kv,
    flightPlans: new FlightPlanRepository(db),
    progress: new TrainingProgressRepository(db),
    scenarios: new JsonDocumentRepository<Scenario>(db, 'scenarios'),
    attempts: new ScenarioAttemptRepository(db),
    replays: new ReplayRepository(db),
    outbox: new SyncOutboxRepository(db),
    recovered,
  }
}
