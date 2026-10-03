import { Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { useAdFreeContext } from '@/platform/ads'

interface Section {
  title: string
  body: string
}

/** Privacy policy / terms / simulation disclaimer (ko & en). */
export default function LegalScreen() {
  const { t } = useTranslation()
  const { doc = 'disclaimer' } = useLocalSearchParams<{ doc: string }>()
  useAdFreeContext('LEGAL')
  if (doc === 'disclaimer') {
    const points = t('legal.disclaimer.points', { returnObjects: true }) as string[]
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title: t('legal.disclaimer.title') }} />
        <View style={{ borderColor: colors.warning, borderWidth: 1, borderRadius: 8, padding: 14 }}>
          <Text style={ui.body}>{t('legal.disclaimer.body')}</Text>
        </View>
        {points.map((p) => (
          <Text key={p} style={ui.muted}>
            • {p}
          </Text>
        ))}
      </Screen>
    )
  }
  const key = doc === 'terms' ? 'terms' : 'privacy'
  const sections = t(`legal.${key}.sections`, { returnObjects: true }) as Section[]
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t(`legal.${key}.title`) }} />
      <Text style={ui.faint}>{t('legal.lastUpdated', { date: '2026-10-03' })}</Text>
      {key === 'privacy' ? <Text style={ui.body}>{t('legal.privacy.intro')}</Text> : null}
      {sections.map((s) => (
        <View key={s.title} style={{ gap: 4 }}>
          <Text style={ui.h2}>{s.title}</Text>
          <Text style={ui.muted}>{s.body}</Text>
        </View>
      ))}
      <Text style={ui.faint}>{t('legal.contact')}</Text>
    </Screen>
  )
}
