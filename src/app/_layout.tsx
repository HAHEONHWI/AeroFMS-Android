import { Component, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fetchRemoteConfig } from '@aerofms/cloud'
import i18n, { applyLanguage } from '@/i18n'
import { bootstrap } from '@/services/bootstrap'
import { setServices } from '@/services/runtime'
import { analytics } from '@/services/analytics'
import { crashReporter } from '@/platform/native'
import { getFirebase } from '@/platform/firebase'
import { adService, useAds } from '@/platform/ads'
import { useSettings } from '@/stores/settings'
import { useAuth } from '@/stores/auth'
import { startAutoSync, useSync } from '@/stores/sync'
import { Button, ToastHost, toast } from '@/components/common/UI'
import { colors } from '@/theme'
import { useRemote } from '@/stores/remote'

void SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    crashReporter.record(error, info.componentStack ?? 'render')
  }
  override render() {
    if (!this.state.error) return this.props.children
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{i18n.t('common.error')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{i18n.t('common.errorDetail')}</Text>
        <Button variant="primary" title={i18n.t('common.retry')} onPress={() => this.setState({ error: undefined })} />
      </View>
    )
  }
}

async function initRemoteConfig(): Promise<void> {
  const fb = getFirebase()
  if (!fb) return
  const cfg = await fetchRemoteConfig({ projectId: fb.config.projectId, apiKey: fb.config.apiKey, appId: fb.config.appId, appInstanceId: 'android' })
  useRemote.getState().set(cfg)
  useAds.getState().setConfig(cfg.monetization)
  if (cfg.monetization.adsEnabled) {
    const ads = adService()
    await ads.requestConsent()
    await ads.initialize()
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'IBMPlexMono-Regular': require('../../assets/fonts/IBMPlexMono-Regular.ttf'),
    'IBMPlexMono-Medium': require('../../assets/fonts/IBMPlexMono-Medium.ttf'),
    'IBMPlexMono-SemiBold': require('../../assets/fonts/IBMPlexMono-SemiBold.ttf'),
  })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => {
    bootstrap()
      .then(async (svc) => {
        setServices(svc)
        await useSettings.getState().load()
        const s = useSettings.getState().settings
        applyLanguage(s.language)
        analytics.setEnabled(s.analytics)
        crashReporter.setEnabled(s.crashReports)
        svc.sessions.recording = s.replayEnabled
        useAuth.getState().init()
        startAutoSync()
        void useSync.getState().refreshPending()
        void initRemoteConfig().catch(() => undefined)
        setReady(true)
        if (svc.recovered) toast(i18n.t('app.dataRecovered'), 'error')
      })
      .catch((e) => {
        crashReporter.record(e, 'bootstrap')
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [])
  useEffect(() => {
    if ((ready && fontsLoaded) || error) void SplashScreen.hideAsync()
  }, [ready, fontsLoaded, error])
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.text }}>{i18n.t('common.error')}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>{error}</Text>
      </View>
    )
  }
  if (!ready || !fontsLoaded) return null
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bgElevated }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack>
            <ToastHost />
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
