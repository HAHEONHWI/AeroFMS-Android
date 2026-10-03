import { router } from 'expo-router'
import { Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Button, Card, Screen } from '@/components/common/UI'
import { ui } from '@/theme'
import { useAuth } from '@/stores/auth'
import { APP_VERSION } from '@/services/runtime'

export default function ProfileScreen() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const items: [string, string][] = [
    [t('nav.account'), '/account'],
    [t('nav.settings'), '/settings'],
    [t('nav.map'), '/map'],
    [t('nav.replay'), '/replay'],
    [t('nav.instructor'), '/instructor'],
    [t('nav.help'), '/help'],
    [t('nav.disclaimer'), '/legal/disclaimer'],
    [t('nav.privacy'), '/legal/privacy'],
    [t('nav.terms'), '/legal/terms'],
  ]
  return (
    <Screen>
      <Text style={ui.h1}>{t('nav.profile')}</Text>
      <Card>
        <Text style={ui.body}>{user ? t('account.signedInAs', { name: user.displayName }) : t('account.guest')}</Text>
      </Card>
      {items.map(([label, href]) => (
        <Button key={href} title={label} onPress={() => router.push(href as never)} style={{ alignItems: 'flex-start' }} />
      ))}
      <Text style={ui.faint}>AeroFMS {t('common.version', { version: APP_VERSION })}</Text>
      <Text style={ui.faint}>{t('app.disclaimerShort')}</Text>
    </Screen>
  )
}
