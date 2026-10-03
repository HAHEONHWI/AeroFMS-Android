import { useQuery } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatRelative } from '@aerofms/i18n'
import { Screen } from '@/components/common/UI'
import { ui } from '@/theme'
import { services } from '@/services/runtime'
import { currentLanguage } from '@/i18n'

export default function ReplayList() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['sessions', 'replay'], queryFn: () => services().sessions.list() })
  const list = (q.data ?? []).filter((s) => s.actionCount > 0)
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('replay.title') }} />
      <Text style={ui.muted}>{t('replay.subtitle')}</Text>
      {list.length === 0 ? <Text style={ui.muted}>{t('replay.empty')}</Text> : null}
      {list.map((s) => (
        <Pressable key={s.id} accessibilityRole="button" onPress={() => router.push(`/replay/${encodeURIComponent(s.id)}`)} style={ui.card}>
          <Text style={ui.h2}>{s.name}</Text>
          <Text style={ui.faint}>
            {services().registry.definition(s.aircraftId)?.displayName} · {s.origin ?? '----'} → {s.destination ?? '----'} · {t('session.actions', { count: s.actionCount })} · {formatRelative(currentLanguage(), s.updatedAt)}
          </Text>
        </Pressable>
      ))}
    </Screen>
  )
}
