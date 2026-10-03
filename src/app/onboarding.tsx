import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { LanguagePreference } from '@aerofms/i18n'
import type { UserLevel } from '@aerofms/training'
import { Button, Screen } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { applyLanguage } from '@/i18n'
import { services } from '@/services/runtime'
import { useSettings } from '@/stores/settings'
import { useAdFreeContext } from '@/platform/ads'

type Step = 'welcome' | 'simulation' | 'language' | 'experience' | 'aircraft'
const ORDER: Step[] = ['welcome', 'simulation', 'language', 'experience', 'aircraft']

/** First run: intro → simulation-only notice → language → experience level → aircraft. */
export default function Onboarding() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()
  const [step, setStep] = useState<Step>('welcome')
  useAdFreeContext('ONBOARDING')
  const idx = ORDER.indexOf(step)
  const finish = (aircraftId?: string) => {
    update({ onboardingDone: true })
    router.replace(aircraftId ? { pathname: '/emulator', params: { aircraft: aircraftId } } : '/')
  }
  const titles: Record<Step, string> = {
    welcome: t('onboarding.welcomeTitle'),
    simulation: t('onboarding.simTitle'),
    language: t('onboarding.languageTitle'),
    experience: t('onboarding.experienceTitle'),
    aircraft: t('onboarding.aircraftTitle'),
  }
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Text style={ui.faint}>
        {idx + 1} / {ORDER.length}
      </Text>
      <Text style={ui.h1}>{titles[step]}</Text>
      {step === 'welcome' ? <Text style={ui.body}>{t('onboarding.welcomeText')}</Text> : null}
      {step === 'simulation' ? (
        <View style={{ borderWidth: 1, borderColor: colors.warning, borderRadius: 8, padding: 14 }}>
          <Text style={ui.body}>{t('onboarding.simText')}</Text>
        </View>
      ) : null}
      {step === 'language'
        ? (['system', 'ko', 'en'] as LanguagePreference[]).map((l) => (
            <Button
              key={l}
              variant={settings.language === l ? 'primary' : 'secondary'}
              title={l === 'system' ? t('settings.languageSystem') : l === 'ko' ? '한국어' : 'English'}
              onPress={() => {
                update({ language: l })
                applyLanguage(l)
              }}
            />
          ))
        : null}
      {step === 'experience'
        ? (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as UserLevel[]).map((l) => (
            <Pressable key={l} accessibilityRole="radio" accessibilityState={{ selected: settings.trainingLevel === l }} onPress={() => update({ trainingLevel: l })} style={[ui.card, settings.trainingLevel === l && { borderColor: colors.accent }]}>
              <Text style={ui.h2}>{t(`level.${l}`)}</Text>
              <Text style={ui.muted}>{t(`level.${l}Desc`)}</Text>
            </Pressable>
          ))
        : null}
      {step === 'aircraft'
        ? services()
            .registry.list()
            .filter((a) => a.quickStart)
            .map((a) => <Button key={a.id} title={a.displayName} onPress={() => finish(a.id)} />)
        : null}
      <View style={[ui.row, { justifyContent: 'space-between', marginTop: 12 }]}>
        {step !== 'simulation' ? <Button variant="ghost" title={t('onboarding.skip')} onPress={() => finish()} /> : <View />}
        {step === 'aircraft' ? (
          <Button variant="primary" title={t('onboarding.finish')} onPress={() => finish()} />
        ) : (
          <Button variant="primary" title={step === 'simulation' ? t('onboarding.simAccept') : t('common.next')} onPress={() => setStep(ORDER[idx + 1] ?? 'aircraft')} />
        )}
      </View>
    </Screen>
  )
}
