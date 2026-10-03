import { useQuery } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BUILTIN_LESSONS, LESSON_CATEGORIES } from '@aerofms/training'
import type { UserLevel } from '@aerofms/training'
import { Badge, Button, Card, Screen, Segmented } from '@/components/common/UI'
import { AdBanner } from '@/platform/ads'
import { colors, ui } from '@/theme'
import { services } from '@/services/runtime'
import { useLocalized } from '@/i18n'
import { useSettings } from '@/stores/settings'

export default function AcademyScreen() {
  const { t } = useTranslation()
  const L = useLocalized()
  const { settings, update } = useSettings()
  const progress = useQuery({ queryKey: ['progress'], queryFn: () => services().progress.list() })
  useFocusEffect(() => void progress.refetch())
  const byId = new Map((progress.data ?? []).map((p) => [p.lessonId, p]))
  return (
    <Screen>
      <Text style={ui.h1}>{t('academy.title')}</Text>
      <Text style={ui.muted}>{t('academy.subtitle')}</Text>
      <Text style={ui.label}>{t('academy.levelLabel')}</Text>
      <Segmented<UserLevel>
        label={t('academy.levelLabel')}
        value={settings.trainingLevel}
        onChange={(v) => update({ trainingLevel: v })}
        options={(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((l) => ({ value: l, label: t(`level.${l}`) }))}
      />
      {LESSON_CATEGORIES.map((cat) => {
        const lessons = BUILTIN_LESSONS.filter((l) => l.category === cat)
        if (!lessons.length) return null
        return (
          <View key={cat} style={{ gap: 8 }}>
            <Text style={ui.label}>{t(`academy.categories.${cat}`)}</Text>
            {lessons.map((l) => {
              const p = byId.get(l.id)
              return (
                <Card key={l.id}>
                  <View style={[ui.row, { flexWrap: 'wrap' }]}>
                    <Badge text={services().registry.definition(l.aircraftId)?.model ?? l.aircraftId} />
                    <Badge tone={l.difficulty === 'HARD' ? 'warn' : 'neutral'} text={t(`difficulty.${l.difficulty}`)} />
                    <Text style={ui.faint}>{t('common.minutes', { count: l.estimatedMinutes })}</Text>
                  </View>
                  <Text style={ui.h2}>{L(l.title)}</Text>
                  <Text style={ui.muted}>{L(l.description)}</Text>
                  <Text style={{ color: p?.status === 'COMPLETED' ? colors.success : colors.textFaint, fontSize: 12 }}>
                    {p?.status === 'COMPLETED' ? `${t('academy.completed')} · ${t('academy.bestScore', { score: p.bestScore })}` : p?.status === 'IN_PROGRESS' ? t('academy.inProgress') : t('academy.notStarted')}
                  </Text>
                  <Button variant="primary" title={p?.status === 'COMPLETED' ? t('academy.restart') : t('academy.start')} onPress={() => router.push({ pathname: '/emulator', params: { lesson: l.id } })} />
                </Card>
              )
            })}
          </View>
        )
      })}
      <AdBanner placement="LIST_BANNER" />
    </Screen>
  )
}
