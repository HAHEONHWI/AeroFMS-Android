import type { ColorValue } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import { colors } from '@/theme'
import { useSettings } from '@/stores/settings'

type IconName = keyof typeof Ionicons.glyphMap

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />
  }
}

export default function TabsLayout() {
  const { t } = useTranslation()
  const onboardingDone = useSettings((s) => s.settings.onboardingDone)
  if (!onboardingDone) return <Redirect href="/onboarding" />
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home'), tabBarIcon: icon('home-outline') }} />
      {/* The emulator hides the tab bar to maximise the CDU area. */}
      <Tabs.Screen name="emulator" options={{ title: t('nav.emulator'), tabBarIcon: icon('keypad-outline'), tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="academy" options={{ title: t('nav.academy'), tabBarIcon: icon('school-outline') }} />
      <Tabs.Screen name="scenarios" options={{ title: t('nav.scenarios'), tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile'), tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  )
}
