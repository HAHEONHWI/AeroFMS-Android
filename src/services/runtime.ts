import type { AppServices } from './bootstrap'

let current: AppServices | undefined

export function setServices(s: AppServices): void {
  current = s
}

export function services(): AppServices {
  if (!current) throw new Error('AppServices not initialised')
  return current
}

export const isDebugBuild = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEBUG_TOOLS === 'true'
export const APP_VERSION = '1.0.0'
