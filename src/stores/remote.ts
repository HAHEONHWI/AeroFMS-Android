import { create } from 'zustand'
import { DEFAULT_REMOTE_CONFIG } from '@aerofms/cloud'
import type { AppRemoteConfig } from '@aerofms/cloud'

export const useRemote = create<{ config: AppRemoteConfig; set(c: AppRemoteConfig): void }>((set) => ({
  config: DEFAULT_REMOTE_CONFIG,
  set: (config) => set({ config }),
}))
