import { create } from 'zustand'
import { AppState } from 'react-native'
import type { EngineUpdate, FmsActionInput, FmsEngine, FmsEvent, FmsState } from '@aerofms/core'
import { services } from '@/services/runtime'
import { track } from '@/services/analytics'
import { crashReporter } from '@/platform/native'

export type OpenResult = 'ok' | 'corrupted' | 'notfound' | 'unknown'

interface FmsStore {
  engine?: FmsEngine
  state?: FmsState
  checkpoint?: FmsState
  eventLog: FmsEvent[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  openAircraft(aircraftId: string): Promise<void>
  openSession(id: string): Promise<OpenResult>
  newSession(aircraftId: string, opts?: { name?: string; airport?: string }): Promise<void>
  switchAircraft(target: string, mode: 'save' | 'discard'): Promise<void>
  dispatch(action: FmsActionInput): FmsEvent[]
  resetSession(): Promise<void>
  deleteSession(id: string): Promise<void>
  reload(): Promise<void>
}

let unsubscribe: (() => void) | undefined
let detach: (() => void) | undefined
let simTimer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<(u: EngineUpdate) => void>()

export function onEngineUpdate(fn: (u: EngineUpdate) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const SIM_TICK_MS = 500

function updateSimTicker(state: FmsState | undefined): void {
  const running = state?.simulation.status === 'RUNNING' && state.simulation.source === 'STANDALONE'
  if (running && !simTimer) simTimer = setInterval(() => useFms.getState().dispatch({ type: 'SIM_TICK', dtSec: SIM_TICK_MS / 1000 }), SIM_TICK_MS)
  else if (!running && simTimer) {
    clearInterval(simTimer)
    simTimer = undefined
  }
}

// Persist immediately when the app goes to the background (process may be killed afterwards).
AppState.addEventListener('change', (s) => {
  if (s !== 'active') void services().sessions.flush()
})

export const useFms = create<FmsStore>((set, get) => {
  const attach = (engine: FmsEngine): void => {
    unsubscribe?.()
    detach?.()
    detach = services().sessions.attach(engine)
    unsubscribe = engine.subscribe((u) => {
      const log = get().eventLog
      set({ state: u.state, eventLog: u.events.length ? [...log.slice(-299), ...u.events] : log })
      updateSimTicker(u.state)
      for (const l of listeners) {
        try {
          l(u)
        } catch (e) {
          crashReporter.record(e, 'engine listener')
        }
      }
    })
    set({ engine, state: engine.state, checkpoint: engine.state, status: 'ready', error: undefined, eventLog: [] })
    updateSimTicker(engine.state)
    track('emulator_started', { aircraft_id: engine.state.aircraft.aircraftId, platform: 'android' })
  }
  return {
    eventLog: [],
    status: 'idle',
    async openAircraft(aircraftId) {
      set({ status: 'loading' })
      try {
        attach(await services().sessions.openOrCreateForAircraft(aircraftId))
        track('aircraft_selected', { aircraft_id: aircraftId })
      } catch (e) {
        crashReporter.record(e, 'openAircraft')
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    },
    async openSession(id) {
      set({ status: 'loading' })
      const r = await services().sessions.open(id)
      if (r.ok) {
        attach(r.engine)
        return 'ok'
      }
      set({ status: get().engine ? 'ready' : 'idle' })
      return r.reason === 'CORRUPTED' ? 'corrupted' : r.reason === 'NOT_FOUND' ? 'notfound' : 'unknown'
    },
    async newSession(aircraftId, opts = {}) {
      set({ status: 'loading' })
      await services().sessions.flush()
      attach(await services().sessions.create(aircraftId, opts.name))
      if (opts.airport) {
        const icao = opts.airport.trim().toUpperCase()
        get().dispatch({ type: 'COMMAND', command: { kind: 'SET_POSITION_FROM_AIRPORT', icao } })
        get().dispatch({ type: 'COMMAND', command: { kind: 'SET_ORIGIN', icao } })
      }
    },
    async switchAircraft(target, mode) {
      const { checkpoint } = get()
      if (mode === 'discard' && checkpoint) await services().sessions.discardSince(checkpoint)
      else await services().sessions.flush()
      await get().openAircraft(target)
    },
    dispatch(action) {
      const engine = get().engine
      if (!engine) return []
      return engine.dispatch({ ...action, t: Date.now() } as never)
    },
    async resetSession() {
      const st = get().state
      if (!st) return
      const engine = await services().sessions.reset(st.session.sessionId)
      if (engine) attach(engine)
    },
    async deleteSession(id) {
      const current = get().state
      await services().sessions.delete(id)
      if (current?.session.sessionId === id) await get().openAircraft(current.aircraft.aircraftId)
    },
    async reload() {
      const st = get().state
      if (st) await get().openSession(st.session.sessionId)
    },
  }
})
