import { useState } from 'react'
import { Text } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { HELP_ARTICLES } from '@aerofms/training'
import { Card, Field, Screen } from '@/components/common/UI'
import { ui } from '@/theme'

export default function HelpScreen() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const list = HELP_ARTICLES.map((id) => ({ id, title: t(`help.articles.${id}.title`), body: t(`help.articles.${id}.body`) })).filter((a) => !q.trim() || `${a.title} ${a.body}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('help.title') }} />
      <Field label={t('common.search')} placeholder={t('help.searchPlaceholder')} value={q} onChangeText={setQ} />
      {list.length === 0 ? <Text style={ui.muted}>{t('common.noResults')}</Text> : null}
      {list.map((a) => (
        <Card key={a.id}>
          <Text style={ui.h2}>{a.title}</Text>
          <Text style={ui.muted}>{a.body}</Text>
        </Card>
      ))}
    </Screen>
  )
}
