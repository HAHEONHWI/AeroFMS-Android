import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { getLocales } from 'expo-localization'
import { intlLocale, resolveLanguage, resources } from '@aerofms/i18n'
import type { AppLanguage, LanguagePreference } from '@aerofms/i18n'
import type { LocalizedText } from '@aerofms/training'
import { useCallback } from 'react'

const deviceLocales = (): string[] => getLocales().map((l) => l.languageTag)

// eslint-disable-next-line import/no-named-as-default-member -- the shared i18next instance is configured here
void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage('system', deviceLocales()),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export function applyLanguage(pref: LanguagePreference): AppLanguage {
  const lang = resolveLanguage(pref, deviceLocales())
  // eslint-disable-next-line import/no-named-as-default-member -- see above
  void i18n.changeLanguage(lang)
  return lang
}

export const currentLanguage = (): AppLanguage => (i18n.language === 'ko' ? 'ko' : 'en')

export function useLocalized(): (text: LocalizedText | undefined) => string {
  const { t } = useTranslation()
  return useCallback((text) => (!text ? '' : 'key' in text ? t(text.key, text.params ?? {}) : text.text), [t])
}

export const localeTag = (): string => intlLocale(currentLanguage())

export default i18n
