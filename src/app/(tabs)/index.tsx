import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { Image, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatRelative } from '@aerofms/i18n'
import { BUILTIN_LESSONS, BUILTIN_SCENARIOS } from '@aerofms/training'
import { Badge, Button, Card, Screen } from '@/components/common/UI'
import { AdBanner } from '@/platform/ads'
import { colors, fonts, ui } from '@/theme'
import { services, APP_VERSION } from '@/services/runtime'
import { currentLanguage, useLocalized } from '@/i18n'
import { useConnector } from '@/components/emulator/ConnectorPanel'
import { useRemote } from '@/stores/remote'
import { isVersionBelow } from '@aerofms/cloud'

export default function HomeScreen() {
  const { t } = useTranslation()
  const L = useLocalized()
  const s = services()
  const sessions = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => s.sessions.list() })
  const current = useQuery({ queryKey: ['sessions', 'current'], queryFn: () => s.sessions.currentSessionId().then((id) => id ?? null) })
  const progress = useQuery({ queryKey: ['progress'], queryFn: () => s.progress.list() })
  const plans = useQuery({ queryKey: ['flightPlans'], queryFn: () => s.flightPlans.list() })
  const connector = useConnector((c) => c.status)
  const remote = useRemote((r) => r.config)
  // The open session first; otherwise the most recently updated one.
  const recent = sessions.data?.find((x) => x.id === current.data) ?? sessions.data?.[0]
  // Tabs stay mounted, so refresh session data whenever Home becomes visible again.
  const { refetch: refetchSessions } = sessions
  const { refetch: refetchCurrent } = current
  useFocusEffect(
    useCallback(() => {
      void refetchSessions()
      void refetchCurrent()
    }, [refetchSessions, refetchCurrent]),
  )
  const done = new Set((progress.data ?? []).filter((p) => p.status === 'COMPLETED').map((p) => p.lessonId))
  const nextLesson = BUILTIN_LESSONS.find((l) => !done.has(l.id)) ?? BUILTIN_LESSONS[0]
  const notice = currentLanguage() === 'ko' ? remote.noticeKo : remote.noticeEn
  return (
    <Screen>
      <View style={[ui.row, { gap: 12 }]}>
        <Image source={require('../../../assets/icon.png')} style={{ width: 44, height: 44, borderRadius: 10 }} accessibilityIgnoresInvertColors />
        <View>
          <Text style={ui.h1}>AeroFMS</Text>
          <Text style={ui.muted}>{t('app.tagline')}</Text>
        </View>
      </View>
      {isVersionBelow(APP_VERSION, remote.minimumSupportedVersion) ? <Text style={{ color: colors.warning }}>{t('remote.updateRequired')}</Text> : null}
      {notice ? <Text style={{ color: colors.info }}>{notice}</Text> : null}
      <Text style={ui.body}>{t('home.heroTitle')}</Text>
      <Card>
        <Text style={ui.label}>{t('home.recentSession')}</Text>
        {recent ? (
          <>
            <Text style={ui.h2}>{s.registry.definition(recent.aircraftId)?.displayName}</Text>
            <Text style={{ fontFamily: fonts.mono, color: colors.cdu.green }}>
              {recent.origin ?? '----'} → {recent.destination ?? '----'}
            </Text>
            <Text style={ui.faint}>{t('session.updated', { time: formatRelative(currentLanguage(), recent.updatedAt) })}</Text>
            <Button variant="primary" title={t('home.continueSession')} onPress={() => router.push({ pathname: '/emulator', params: { session: recent.id } })} />
          </>
        ) : (
          <Text style={ui.muted}>{t('home.noSession')}</Text>
        )}
      </Card>
      <Card>
        <Text style={ui.label}>{t('home.quickStart')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {s.registry
            .list()
            .filter((a) => a.quickStart)
            .map((a) => (
              <Button key={a.id} style={{ width: '48%' }} title={a.model} onPress={() => router.push({ pathname: '/emulator', params: { aircraft: a.id } })} />
            ))}
        </View>
        <Button variant="ghost" title={t('home.allAircraft')} onPress={() => router.push('/emulator')} />
      </Card>
      {nextLesson ? (
        <Card>
          <Text style={ui.label}>{t('home.recommendedLesson')}</Text>
          <Text style={ui.body}>{L(nextLesson.title)}</Text>
          <Button title={t('academy.start')} onPress={() => router.push({ pathname: '/emulator', params: { lesson: nextLesson.id } })} />
        </Card>
      ) : null}
      <Card>
        <Text style={ui.label}>{t('home.recentScenarios')}</Text>
        {BUILTIN_SCENARIOS.slice(0, 3).map((sc) => (
          <Button key={sc.id} variant="ghost" title={L(sc.title)} onPress={() => router.push(`/scenario/${sc.id}`)} style={{ alignItems: 'flex-start' }} />
        ))}
      </Card>
      <Card>
        <Text style={ui.label}>{t('home.recentPlans')}</Text>
        {(plans.data ?? []).slice(0, 3).map((p) => (
          <Text key={p.id} style={{ fontFamily: fonts.mono, color: colors.cdu.green }}>
            {p.name}
          </Text>
        ))}
        {(plans.data ?? []).length === 0 ? <Text style={ui.faint}>—</Text> : null}
      </Card>
      <Card>
        <Text style={ui.label}>{t('home.navDbStatus')}</Text>
        <View style={ui.row}>
          <Text style={ui.mono}>{s.nav.meta.cycle}</Text>
          <Badge tone="warn" text="DEMO" />
        </View>
        <Text style={ui.label}>{t('home.simulatorStatus')}</Text>
        <Text style={ui.body}>{t(`connector.status.${connector}`)}</Text>
      </Card>
      <Button variant="ghost" title={t('nav.map')} onPress={() => router.push('/map')} />
      <Button variant="ghost" title={t('nav.replay')} onPress={() => router.push('/replay')} />
      <Text style={ui.faint}>{t('app.disclaimerShort')}</Text>
      <AdBanner placement="HOME_BANNER" />
    </Screen>
  )
}
