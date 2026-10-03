import { Text, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { scenarioById } from '@aerofms/training'
import type { Scenario } from '@aerofms/training'
import { ScenarioCloud } from '@aerofms/cloud'
import { formatDateTime } from '@aerofms/i18n'
import { Badge, Button, Card, Screen, toast } from '@/components/common/UI'
import { colors, fonts, ui } from '@/theme'
import { services } from '@/services/runtime'
import { currentLanguage, useLocalized } from '@/i18n'
import { getFirebase } from '@/platform/firebase'
import { useAuth } from '@/stores/auth'

async function load(id: string, cloud: boolean): Promise<{ scenario: Scenario; source: string } | null> {
  const b = scenarioById(id)
  if (b) return { scenario: b, source: 'BUILTIN' }
  const local = await services().scenarios.get(id)
  if (local && !cloud) return { scenario: local.doc, source: local.source }
  const fb = getFirebase()
  if (fb) {
    const r = await new ScenarioCloud(fb.db, fb.functions).get(id).catch(() => null)
    if (r) {
      await services().scenarios.save(r.scenario, 'CLOUD')
      return { scenario: r.scenario, source: 'CLOUD' }
    }
  }
  return local ? { scenario: local.doc, source: local.source } : null
}

export default function ScenarioDetail() {
  const { t } = useTranslation()
  const L = useLocalized()
  const { id = '', cloud } = useLocalSearchParams<{ id: string; cloud?: string }>()
  const user = useAuth((s) => s.user)
  const q = useQuery({ queryKey: ['scenario', id], queryFn: () => load(id, cloud === '1') })
  const attempts = useQuery({ queryKey: ['attempts', id], queryFn: () => services().attempts.list(id) })
  if (!q.data) return <Text style={[ui.muted, { padding: 16 }]}>{q.isLoading ? t('app.loading') : t('common.notFound')}</Text>
  const { scenario, source } = q.data
  const b = scenario.briefing
  const fb = getFirebase()
  const mine = source === 'LOCAL'
  const share = async () => {
    if (!fb || !user) return toast(t('scenarios.loginToShare'), 'error')
    try {
      const c = new ScenarioCloud(fb.db, fb.functions)
      const updated: Scenario = { ...scenario, visibility: scenario.visibility === 'PRIVATE' ? 'UNLISTED' : scenario.visibility, authorUid: user.uid, authorName: user.displayName }
      await c.save(user.uid, user.displayName, updated)
      const code = await c.share(scenario.id)
      await services().scenarios.save({ ...updated, shareCode: code }, 'LOCAL')
      toast(`${t('scenarios.shareCode')}: ${code}`, 'success')
      void q.refetch()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    }
  }
  const lines: [string, string | undefined][] = [
    [t('scenarios.builder.origin'), b.origin],
    [t('scenarios.builder.destination'), b.destination],
    [t('scenarios.builder.runway'), b.runway],
    ['SID', b.sid],
    [t('scenarios.route'), b.route],
    ['STAR', b.star],
    [t('scenarios.builder.approach'), b.approach],
    [t('scenarios.builder.cruise'), b.cruiseAltitudeFt ? `FL${Math.round(b.cruiseAltitudeFt / 100)}` : undefined],
    ['ZFW', b.zfwKg ? `${(b.zfwKg / 1000).toFixed(1)} t` : undefined],
    [t('modern.fuel'), b.fuelKg ? `${(b.fuelKg / 1000).toFixed(1)} t` : undefined],
    ['CI', b.costIndex !== undefined ? String(b.costIndex) : undefined],
  ]
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('scenarios.title') }} />
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <Badge text={services().registry.definition(scenario.aircraftId)?.displayName ?? scenario.aircraftId} />
        <Badge text={t(`difficulty.${scenario.difficulty}`)} />
        <Badge text={t(`scenarios.visibility.${scenario.visibility}`)} />
        {scenario.shareCode ? <Badge tone="accent" text={scenario.shareCode} /> : null}
      </View>
      <Text style={ui.h1}>{L(scenario.title)}</Text>
      <Text style={ui.muted}>{L(scenario.description)}</Text>
      <Button variant="primary" title={t('scenarios.start')} onPress={() => router.push({ pathname: '/emulator', params: { scenario: scenario.id } })} />
      {mine && fb ? <Button title={t('scenarios.publish')} onPress={() => void share()} /> : null}
      {mine ? (
        <Button
          variant="ghost"
          title={t('common.delete')}
          onPress={async () => {
            await services().scenarios.delete(scenario.id)
            router.back()
          }}
        />
      ) : null}
      <Card>
        <Text style={ui.h2}>{t('scenarios.briefing')}</Text>
        {lines
          .filter(([, v]) => !!v)
          .map(([k, v]) => (
            <View key={k} style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.faint}>{k}</Text>
              <Text style={{ fontFamily: fonts.mono, color: colors.text, flexShrink: 1, textAlign: 'right' }}>{v}</Text>
            </View>
          ))}
      </Card>
      <Card>
        <Text style={ui.h2}>{t('scenarios.objectives')}</Text>
        {scenario.objectives.map((o, i) => (
          <Text key={o.id} style={ui.body}>
            {i + 1}. {L(o.text)} <Text style={ui.faint}>({t('common.points', { count: o.points })})</Text>
          </Text>
        ))}
      </Card>
      <Card>
        <Text style={ui.h2}>{t('scenarios.attempts')}</Text>
        {(attempts.data ?? []).length === 0 ? <Text style={ui.faint}>—</Text> : null}
        {(attempts.data ?? []).map((a) => (
          <Text key={a.id} style={ui.muted}>
            {formatDateTime(currentLanguage(), a.createdAt)} · {t('training.score')} {String(a.score)} · {String(a.completionPct)}%
          </Text>
        ))}
      </Card>
    </Screen>
  )
}
