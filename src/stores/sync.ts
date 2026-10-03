import { create } from 'zustand'
import * as Network from 'expo-network'
import { CloudSync } from '@aerofms/cloud'
import type { SyncReport } from '@aerofms/cloud'
import { createId } from '@aerofms/shared'
import { getFirebase } from '@/platform/firebase'
import { services } from '@/services/runtime'
import { useAuth } from './auth'
import { useSettings } from './settings'
import { onEngineUpdate, useFms } from './fms'

interface SyncStore {
  running: boolean
  lastSync?: number
  lastReport?: SyncReport
  error?: string
  pending: number
  syncNow(): Promise<void>
  refreshPending(): Promise<void>
}

async function deviceId(): Promise<string> {
  let id = await services().kv.get<string>('device.id')
  if (!id) {
    id = createId('android-')
    await services().kv.set('device.id', id)
  }
  return id
}

export const useSync = create<SyncStore>((set, get) => ({
  running: false,
  pending: 0,
  async refreshPending() {
    set({ pending: await services().outbox.count() })
  },
  async syncNow() {
    const fb = getFirebase()
    const user = useAuth.getState().user
    if (!fb || !user || !useSettings.getState().settings.cloudSync || get().running) return
    const net = await Network.getNetworkStateAsync().catch(() => null)
    if (net && net.isInternetReachable === false) return
    set({ running: true, error: undefined })
    try {
      const s = services()
      await s.sessions.flush()
      const report = await new CloudSync({ db: fb.db, uid: user.uid, deviceId: await deviceId(), outbox: s.outbox, sessions: s.sessions.sessions, progress: s.progress, flightPlans: s.flightPlans }).syncAll()
      set({ lastSync: Date.now(), lastReport: report })
      const open = useFms.getState().state?.session.sessionId
      if (open && report.pulledSessions.includes(open)) await useFms.getState().reload()
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      set({ running: false })
      await get().refreshPending()
    }
  },
}))

let timer: ReturnType<typeof setTimeout> | undefined

export function startAutoSync(): void {
  onEngineUpdate((u) => {
    if (!useAuth.getState().user || !useSettings.getState().settings.cloudSync || u.action.type === 'SIM_TICK') return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      void services()
        .outbox.enqueue('aircraftSessions', u.state.session.sessionId, 'UPSERT')
        .then(() => useSync.getState().refreshPending())
    }, 3000)
  })
  setInterval(() => void useSync.getState().syncNow(), 90_000)
  useAuth.subscribe((s, prev) => {
    if (s.user && s.user.uid !== prev.user?.uid) void useSync.getState().syncNow()
  })
}
