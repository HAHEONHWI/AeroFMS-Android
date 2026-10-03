import Constants from 'expo-constants'
import type { AnalyticsSink } from '@aerofms/cloud'

/** Build-time switches written by app.config.ts. */
const extra = (Constants.expoConfig?.extra ?? {}) as { nativeFirebase?: boolean; adsNative?: boolean; admob?: Record<string, string> }
export const NATIVE_FIREBASE = extra.nativeFirebase === true
export const ADS_NATIVE = extra.adsNative === true
export const ADMOB_UNITS = extra.admob ?? {}

type CrashlyticsModule = {
  getCrashlytics(): unknown
  setCrashlyticsCollectionEnabled(c: unknown, enabled: boolean): Promise<void>
  recordError(c: unknown, error: Error, name?: string): void
  log(c: unknown, message: string): void
}

function crashlytics(): CrashlyticsModule | null {
  if (!NATIVE_FIREBASE) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module is only linked in some builds
    return require('@react-native-firebase/crashlytics') as CrashlyticsModule
  } catch {
    return null
  }
}

/** Crashlytics wrapper; a no-op when the native Firebase SDK is not part of the build. */
export const crashReporter = {
  setEnabled(enabled: boolean): void {
    const m = crashlytics()
    if (m) void m.setCrashlyticsCollectionEnabled(m.getCrashlytics(), enabled).catch(() => undefined)
  },
  record(error: unknown, context?: string): void {
    const m = crashlytics()
    if (!m) return
    const c = m.getCrashlytics()
    if (context) m.log(c, context)
    m.recordError(c, error instanceof Error ? error : new Error(String(error)))
  },
}

/** Firebase Analytics sink (native SDK). */
export function createNativeAnalyticsSink(): AnalyticsSink {
  let enabled = false
  const mod = (): { getAnalytics(): unknown; logEvent(a: unknown, e: string, p: object): Promise<void>; setAnalyticsCollectionEnabled(a: unknown, v: boolean): Promise<void> } | null => {
    if (!NATIVE_FIREBASE) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module is only linked in some builds
      return require('@react-native-firebase/analytics')
    } catch {
      return null
    }
  }
  return {
    setEnabled(v) {
      enabled = v
      const m = mod()
      if (m) void m.setAnalyticsCollectionEnabled(m.getAnalytics(), v).catch(() => undefined)
    },
    log(event, params) {
      const m = mod()
      if (enabled && m) void m.logEvent(m.getAnalytics(), event, params).catch(() => undefined)
    },
  }
}
