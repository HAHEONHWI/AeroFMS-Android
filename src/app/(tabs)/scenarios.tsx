import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { SHARE_CODE_PATTERN } from '@aerofms/shared'
import { BUILTIN_SCENARIOS } from '@aerofms/training'
import type { Scenario } from '@aerofms/training'
import { ScenarioCloud } from '@aerofms/cloud'
import { Badge, Button, Field, Screen, toast } from '@/components/common/UI'
import { AdBanner } from '@/platform/ads'
import { colors, fonts, ui } from '@/theme'
import { services } from '@/services/runtime'
import { useLocalized } from '@/i18n'
import { getFirebase } from '@/platform/firebase'

function Row({ s, cloud }: { s: Scenario; cloud?: boolean }) {
  const { t } = useTranslation()
  const L = useLocalized()
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/scenario/[id]', params: { id: s.id, cloud: cloud ? '1' : '0' } })} style={[ui.card, { gap: 6 }]}>
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <Badge text={services().registry.definition(s.aircraftId)?.model ?? s.aircraftId} />
        <Badge tone={s.difficulty === 'HARD' ? 'warn' : 'neutral'} text={t(`difficulty.${s.difficulty}`)} />
        {s.builtIn ? <Badge tone="accent" text={t('scenarios.builtIn')} /> : null}
      </View>
      <Text style={ui.h2}>{L(s.title)}</Text>
      <Text style={ui.muted} numberOfLines={2}>
        {L(s.description)}
      </Text>
      {s.briefing.origin ? (
        <Text style={{ fontFamily: fonts.mono, color: colors.cdu.green }}>
          {s.briefing.origin} → {s.briefing.destination}
        </Text>
      ) : null}
    </Pressable>
  )
}

export default function ScenariosScreen() {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string>()
  const mine = useQuery({ queryKey: ['scenarios', 'local'], queryFn: () => services().scenarios.list() })
  useFocusEffect(() => void mine.refetch())
  const fb = getFirebase()
  const community = useQuery({ queryKey: ['scenarios', 'public'], queryFn: () => (fb ? new ScenarioCloud(fb.db).listPublic() : Promise.resolve([])), enabled: !!fb, retry: false })
  const join = async () => {
    const c = code.trim().toUpperCase()
    if (!SHARE_CODE_PATTERN.test(c)) return setErr(t('scenarios.codeInvalid'))
    if (!fb) return setErr(t('common.cloudUnavailable'))
    try {
      const found = await new ScenarioCloud(fb.db).getByCode(c)
      if (!found) return setErr(t('scenarios.codeNotFound'))
      await services().scenarios.save(found.scenario, 'CLOUD')
      router.push(`/scenario/${found.scenario.id}`)
    } catch {
      toast(t('common.networkRequired'), 'error')
    }
  }
  return (
    <Screen>
      <Text style={ui.h1}>{t('scenarios.title')}</Text>
      <Text style={ui.muted}>{t('scenarios.subtitle')}</Text>
      <Button variant="primary" title={t('scenarios.create')} onPress={() => router.push('/scenario/new')} />
      <Field label={t('scenarios.enterCode')} placeholder={t('scenarios.codePlaceholder')} value={code} autoCapitalize="characters" error={err} onChangeText={(v) => (setCode(v.toUpperCase()), setErr(undefined))} />
      <Button title={t('scenarios.join')} onPress={() => void join()} />
      <Text style={ui.label}>{t('scenarios.builtIn')}</Text>
      {BUILTIN_SCENARIOS.map((s) => (
        <Row key={s.id} s={s} />
      ))}
      <Text style={ui.label}>{t('scenarios.mine')}</Text>
      {(mine.data ?? []).length === 0 ? <Text style={ui.faint}>—</Text> : (mine.data ?? []).map((r) => <Row key={r.doc.id} s={r.doc} />)}
      {fb ? (
        <>
          <Text style={ui.label}>{t('scenarios.shared')}</Text>
          {(community.data ?? []).map((c) => (
            <Row key={c.scenario.id} s={c.scenario} cloud />
          ))}
          {community.isError ? <Text style={ui.faint}>{t('common.networkRequired')}</Text> : null}
        </>
      ) : null}
      <AdBanner placement="LIST_BANNER" />
    </Screen>
  )
}
