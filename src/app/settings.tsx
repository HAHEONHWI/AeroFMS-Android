import { Alert, Text } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { LanguagePreference } from '@aerofms/i18n'
import type { UnitSystem } from '@aerofms/shared'
import type { UserLevel } from '@aerofms/training'
import { Button, Card, Screen, Select, toast, Toggle } from '@/components/common/UI'
import { ConnectorPanel } from '@/components/emulator/ConnectorPanel'
import { ui } from '@/theme'
import { applyLanguage } from '@/i18n'
import { services, APP_VERSION, isDebugBuild } from '@/services/runtime'
import { ensureNavDatabase } from '@/services/bootstrap'
import { analytics, track } from '@/services/analytics'
import { crashReporter } from '@/platform/native'
import { useSettings } from '@/stores/settings'
import { useAdFreeContext } from '@/platform/ads'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  useAdFreeContext('SETTINGS')
  const nav = services().nav
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <Card>
        <Select
          label={t('settings.language')}
          value={settings.language}
          onChange={(v) => {
            update({ language: v as LanguagePreference })
            track('language_changed', { language: applyLanguage(v as LanguagePreference) })
          }}
          options={[
            { value: 'system', label: t('settings.languageSystem') },
            { value: 'ko', label: t('settings.languageKo') },
            { value: 'en', label: t('settings.languageEn') },
          ]}
        />
        <Select
          label={t('settings.units')}
          value={settings.units}
          onChange={(v) => update({ units: v as UnitSystem })}
          options={[
            { value: 'AVIATION', label: t('settings.unitsAviation') },
            { value: 'METRIC', label: t('settings.unitsMetric') },
            { value: 'IMPERIAL', label: t('settings.unitsImperial') },
          ]}
        />
        <Text style={ui.faint}>{t('settings.unitsNote')}</Text>
      </Card>
      <Card>
        <Text style={ui.h2}>{t('settings.navData')}</Text>
        <Text style={ui.mono}>{nav.meta.cycle}</Text>
        <Text style={ui.faint}>{nav.meta.isDemo ? t('settings.navDataDemoSource') : nav.meta.source}</Text>
        <Button
          title={t('settings.navDataReimport')}
          onPress={async () => {
            await ensureNavDatabase(services().db, true)
            toast(t('settings.navDataReimported'), 'success')
          }}
        />
      </Card>
      <Card>
        <Toggle label={t('settings.mapAirways')} value={settings.mapAirways} onChange={(v) => update({ mapAirways: v })} />
        <Toggle label={t('settings.cloudSyncEnabled')} value={settings.cloudSync} onChange={(v) => update({ cloudSync: v })} />
        <Select
          label={t('settings.sound')}
          value={settings.sound}
          onChange={(v) => update({ sound: v as 'off' | 'soft' | 'classic' })}
          options={[
            { value: 'off', label: t('settings.soundOff') },
            { value: 'soft', label: t('settings.soundSoft') },
            { value: 'classic', label: t('settings.soundClassic') },
          ]}
        />
        <Toggle label={t('settings.haptic')} value={settings.haptic} onChange={(v) => update({ haptic: v })} />
        <Select
          label={t('settings.trainingAssistance')}
          value={settings.trainingLevel}
          onChange={(v) => update({ trainingLevel: v as UserLevel })}
          options={(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((l) => ({ value: l, label: t(`level.${l}`) }))}
        />
        <Toggle label={t('settings.replayEnabled')} value={settings.replayEnabled} onChange={(v) => update({ replayEnabled: v })} />
      </Card>
      <Card>
        <ConnectorPanel />
      </Card>
      <Card>
        <Text style={ui.h2}>{t('settings.privacy')}</Text>
        <Toggle
          label={t('settings.analytics')}
          value={settings.analytics}
          onChange={(v) => {
            update({ analytics: v })
            analytics.setEnabled(v)
          }}
        />
        <Toggle
          label={t('settings.crashReports')}
          value={settings.crashReports}
          onChange={(v) => {
            update({ crashReports: v })
            crashReporter.setEnabled(v)
          }}
        />
      </Card>
      <Card>
        <Text style={ui.muted}>{t('settings.storageInfo')}</Text>
        <Button
          variant="danger"
          title={t('settings.resetLocal')}
          onPress={() =>
            Alert.alert(t('settings.resetLocal'), t('settings.resetLocalConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                  const db = services().db
                  for (const tb of ['sessions', 'session_actions', 'session_events', 'session_snapshots', 'kv', 'flight_plans', 'training_progress', 'scenarios', 'scenario_attempts', 'replays', 'sync_outbox']) {
                    await db.run(`DELETE FROM ${tb}`)
                  }
                  toast(t('common.done'), 'success')
                },
              },
            ])
          }
        />
      </Card>
      <Card>
        <Text style={ui.h2}>{t('settings.about')}</Text>
        <Text style={ui.muted}>{t('settings.aboutText')}</Text>
        <Text style={ui.faint}>
          AeroFMS {t('common.version', { version: APP_VERSION })} {isDebugBuild ? '(debug)' : ''} · dev.heonhwi.areofms
        </Text>
      </Card>
    </Screen>
  )
}
