import { create } from 'zustand'
import type { LanguagePreference } from '@aerofms/i18n'
import type { UnitSystem } from '@aerofms/shared'
import type { UserLevel } from '@aerofms/training'
import { services } from '@/services/runtime'

export type ViewMode = 'CLASSIC' | 'MODERN'

export interface Settings {
  language: LanguagePreference
  units: UnitSystem
  mapAirways: boolean
  sound: 'off' | 'soft' | 'classic'
  haptic: boolean
  trainingLevel: UserLevel
  replayEnabled: boolean
  analytics: boolean
  crashReports: boolean
  cloudSync: boolean
  onboardingDone: boolean
  viewMode: ViewMode
  connectorHost: string
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
  units: 'AVIATION',
  mapAirways: true,
  sound: 'soft',
  haptic: true,
  trainingLevel: 'BEGINNER',
  replayEnabled: true,
  analytics: false,
  crashReports: false,
  cloudSync: true,
  onboardingDone: false,
  viewMode: 'CLASSIC',
  connectorHost: '',
}

interface SettingsStore {
  settings: Settings
  load(): Promise<void>
  update(patch: Partial<Settings>): void
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  async load() {
    const stored = await services().kv.get<Partial<Settings>>('settings')
    set({ settings: { ...DEFAULT_SETTINGS, ...(stored ?? {}) } })
  },
  update(patch) {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    void services().kv.set('settings', next)
    if ('replayEnabled' in patch) services().sessions.recording = next.replayEnabled
  },
}))
