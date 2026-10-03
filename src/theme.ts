import { StyleSheet } from 'react-native'
import { colors, radius, spacing, MIN_HIT_TARGET } from '@aerofms/ui'

export { colors, radius, spacing, MIN_HIT_TARGET }

export const fonts = {
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
  monoSemi: 'IBMPlexMono-SemiBold',
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  h1: { color: colors.text, fontSize: 22, fontWeight: '600' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '600' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  faint: { color: colors.textFaint, fontSize: 12, lineHeight: 17 },
  label: { color: colors.textFaint, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  mono: { fontFamily: fonts.mono, color: colors.text },
  card: { backgroundColor: colors.bgElevated, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
})
