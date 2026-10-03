import { useState } from 'react'
import { Text } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { formatRelative } from '@aerofms/i18n'
import { Button, Card, Field, Screen, Sheet, toast } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { authErrorKey, useAuth } from '@/stores/auth'
import { useSync } from '@/stores/sync'
import { currentLanguage } from '@/i18n'
import { googleIdToken, googleSignInAvailable } from '@/platform/googleSignIn'

export default function AccountScreen() {
  const { t } = useTranslation()
  const auth = useAuth()
  const sync = useSync()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState('')
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await fn()
    } catch (e) {
      setError(t(authErrorKey(e)))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('account.title') }} />
      {!auth.available ? (
        <>
          <Text style={ui.body}>{t('account.guest')}</Text>
          <Text style={ui.muted}>{t('common.cloudUnavailable')}</Text>
        </>
      ) : !auth.user ? (
        <>
          <Text style={ui.body}>{t('account.guest')}</Text>
          <Text style={ui.muted}>{t('account.benefits')}</Text>
          {googleSignInAvailable() ? (
            <Button
              variant="primary"
              title={t('account.signInGoogle')}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const token = await googleIdToken()
                  if (token) await auth.signInWithGoogleIdToken(token)
                })
              }
            />
          ) : null}
          {mode === 'signup' ? <Field label={t('account.displayName')} value={name} maxLength={40} onChangeText={setName} /> : null}
          <Field label={t('account.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label={t('account.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signin' ? 'password' : 'new-password'} />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
          <Button variant="primary" disabled={busy} title={mode === 'signin' ? t('account.signInEmail') : t('account.signUpEmail')} onPress={() => void run(() => (mode === 'signin' ? auth.signInEmail(email, password) : auth.signUpEmail(email, password, name)))} />
          <Button variant="ghost" title={mode === 'signin' ? t('account.signUpEmail') : t('account.signInEmail')} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} />
          <Button
            variant="ghost"
            title={t('account.passwordReset')}
            onPress={() =>
              void run(async () => {
                await auth.resetPassword(email)
                toast(t('account.passwordResetSent'), 'success')
              })
            }
          />
        </>
      ) : (
        <>
          <Text style={ui.h2}>{t('account.signedInAs', { name: auth.user.displayName })}</Text>
          <Card>
            <Text style={ui.h2}>{t('account.syncStatus')}</Text>
            <Text style={ui.muted}>
              {sync.lastSync ? t('account.lastSync', { time: formatRelative(currentLanguage(), sync.lastSync) }) : '—'} · {t('account.pending', { count: sync.pending })}
            </Text>
            {sync.error ? <Text style={{ color: colors.danger }}>{t('account.syncError', { message: sync.error })}</Text> : null}
            <Button title={t('account.syncNow')} disabled={sync.running} onPress={() => void sync.syncNow()} />
          </Card>
          <Button title={t('account.signOut')} onPress={() => void auth.signOut()} />
          <Button variant="danger" title={t('account.deleteAccount')} onPress={() => setDeleting(true)} />
        </>
      )}
      <Sheet
        visible={deleting}
        title={t('account.deleteAccount')}
        onClose={() => setDeleting(false)}
        footer={
          <Button
            variant="danger"
            title={t('account.deleteAccount')}
            disabled={confirm !== 'DELETE' || busy}
            onPress={() =>
              void run(async () => {
                await auth.deleteAccount()
                setDeleting(false)
                toast(t('account.deleteAccountDone'), 'success')
              })
            }
          />
        }
      >
        <Text style={ui.body}>{t('account.deleteAccountText')}</Text>
        <Field label={t('account.deleteAccountConfirm')} value={confirm} autoCapitalize="characters" onChangeText={setConfirm} />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      </Sheet>
    </Screen>
  )
}
