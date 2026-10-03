import { useState } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ScenarioCloud } from '@aerofms/cloud'
import { Button, Card, Screen } from '@/components/common/UI'
import { colors, fonts, ui } from '@/theme'
import { getFirebase } from '@/platform/firebase'
import { useAuth } from '@/stores/auth'
import { useLocalized } from '@/i18n'

export default function InstructorScreen() {
  const { t } = useTranslation()
  const L = useLocalized()
  const user = useAuth((s) => s.user)
  const fb = getFirebase()
  const cloud = fb ? new ScenarioCloud(fb.db, fb.functions) : null
  const [selected, setSelected] = useState<string | null>(null)
  const mine = useQuery({ queryKey: ['instructor', user?.uid], queryFn: () => (cloud && user ? cloud.listMine(user.uid) : Promise.resolve([])), enabled: !!user?.instructor })
  const attempts = useQuery({ queryKey: ['attempts', selected], queryFn: () => (cloud && selected ? cloud.listAttempts(selected) : Promise.resolve([])), enabled: !!selected })
  const list = attempts.data ?? []
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('instructor.title') }} />
      <Text style={ui.muted}>{t('instructor.subtitle')}</Text>
      {!fb ? <Text style={ui.muted}>{t('common.cloudUnavailable')}</Text> : !user ? <Text style={ui.muted}>{t('common.signInRequired')}</Text> : !user.instructor ? (
        <>
          <Text style={ui.body}>{t('instructor.notInstructor')}</Text>
          <Text style={ui.faint}>{t('instructor.requestRole')}</Text>
        </>
      ) : (
        <>
          <Text style={ui.faint}>{t('instructor.privacyNote')}</Text>
          <Text style={ui.label}>{t('instructor.myScenarios')}</Text>
          {(mine.data ?? []).map((c) => (
            <Button key={c.scenario.id} title={`${L(c.scenario.title)} ${c.shareCode ?? ''}`} variant={selected === c.scenario.id ? 'primary' : 'secondary'} onPress={() => setSelected(c.scenario.id)} />
          ))}
          {selected ? (
            <Card>
              <Text style={ui.h2}>{t('instructor.students')}</Text>
              <Text style={ui.muted}>
                {t('instructor.completed')}: {list.filter((a) => a.completionPct >= 100).length} · {t('instructor.averageScore')}: {list.length ? Math.round(list.reduce((s, a) => s + a.score, 0) / list.length) : 0}
              </Text>
              {list.length === 0 ? <Text style={ui.faint}>{t('instructor.noAttempts')}</Text> : null}
              {list.map((a) => (
                <View key={a.id} style={[ui.row, { justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 }]}>
                  <Text style={ui.body}>{a.displayName}</Text>
                  <Text style={{ fontFamily: fonts.mono, color: colors.text }}>
                    {a.score} · {a.completionPct}% · {t('instructor.errors')} {a.incorrectInputs} · {Math.round(a.timeSec / 60)}m
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  )
}
