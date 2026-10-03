import { useState } from 'react'
import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import type { TextInputProps, ViewStyle } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'
import { colors, MIN_HIT_TARGET, radius, spacing, ui } from '@/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({
  title,
  onPress,
  variant = 'secondary',
  disabled,
  small,
  style,
  accessibilityLabel,
}: {
  title: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  small?: boolean
  style?: ViewStyle
  accessibilityLabel?: string
}) {
  const bg = { primary: colors.accent, secondary: colors.surfaceRaised, ghost: 'transparent', danger: colors.danger }[variant]
  const fg = variant === 'primary' ? colors.bg : variant === 'danger' ? '#fff' : variant === 'ghost' ? colors.textMuted : colors.text
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, minHeight: small ? 38 : MIN_HIT_TARGET, borderWidth: variant === 'secondary' ? 1 : 0 },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: variant === 'primary' || variant === 'danger' ? '700' : '500', fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[ui.card, style]}>{children}</View>
}

export function Screen({ children, scroll = true, edges }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom' | 'left' | 'right')[] }) {
  return (
    <SafeAreaView style={ui.screen} edges={edges ?? ['top', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">{children}</ScrollView> : children}
    </SafeAreaView>
  )
}

export function Field({ label, error, hint, ...rest }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        {...rest}
        style={[styles.input, error ? { borderColor: colors.danger } : null, rest.multiline ? { minHeight: 90, textAlignVertical: 'top', paddingTop: 10 } : null]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : hint ? <Text style={ui.faint}>{hint}</Text> : null}
    </View>
  )
}

export function Toggle({ label, value, onChange, description }: { label: string; value: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <View style={[ui.row, { minHeight: MIN_HIT_TARGET, justifyContent: 'space-between' }]}>
      <View style={{ flex: 1 }}>
        <Text style={ui.body}>{label}</Text>
        {description ? <Text style={ui.faint}>{description}</Text> : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.surfaceRaised }} thumbColor={colors.text} />
    </View>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segmented}>
      {options.map((o) => {
        const sel = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, sel && { backgroundColor: colors.surfaceRaised }]}
          >
            <Text style={{ color: sel ? colors.text : colors.textMuted, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Simple picker: a field that opens a modal list. */
export function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.muted}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={[styles.input, { justifyContent: 'center' }]}>
        <Text style={ui.body}>{current?.label ?? '—'}</Text>
      </Pressable>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            onPress={() => {
              onChange(o.value)
              setOpen(false)
            }}
            style={[styles.option, o.value === value && { backgroundColor: colors.surfaceRaised }]}
          >
            <Text style={ui.body}>{o.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </View>
  )
}

export function Sheet({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation()
  // Edge-to-edge: keep the footer above the system navigation bar.
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { paddingBottom: spacing.md + insets.bottom }]}>
        <View style={[ui.row, { justifyContent: 'space-between', paddingBottom: spacing.sm }]}>
          <Text style={ui.h2}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.close}>
            <Text style={ui.muted}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={[ui.row, { justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: spacing.sm }]}>{footer}</View> : null}
      </View>
    </Modal>
  )
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'accent' | 'warn' | 'ok' }) {
  const c = { neutral: colors.textMuted, accent: colors.accent, warn: colors.warning, ok: colors.success }[tone]
  return (
    <View style={{ borderColor: c, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: c, fontSize: 11, fontWeight: '600' }}>{text}</Text>
    </View>
  )
}

interface ToastStore {
  text?: string
  kind: 'info' | 'error' | 'success'
  show(text: string, kind?: 'info' | 'error' | 'success'): void
}

export const useToast = create<ToastStore>((set) => ({
  kind: 'info',
  show(text, kind = 'info') {
    set({ text, kind })
    setTimeout(() => set((s) => (s.text === text ? { text: undefined } : s)), kind === 'error' ? 6000 : 3000)
  },
}))

export const toast = (text: string, kind?: 'info' | 'error' | 'success') => useToast.getState().show(text, kind)

export function ToastHost() {
  const { text, kind } = useToast()
  if (!text) return null
  const border = kind === 'error' ? colors.danger : kind === 'success' ? colors.success : colors.borderStrong
  return (
    <View pointerEvents="none" style={styles.toastWrap} accessibilityLiveRegion="polite">
      <View style={[styles.toast, { borderColor: border }]}>
        <Text style={ui.body}>{text}</Text>
      </View>
    </View>
  )
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={[ui.label, { marginTop: spacing.sm }]}>{children}</Text>
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderColor: colors.border },
  input: { minHeight: MIN_HIT_TARGET, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, color: colors.text, fontSize: 15 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 2, backgroundColor: colors.surface, alignSelf: 'flex-start', flexWrap: 'wrap' },
  segment: { minHeight: 36, paddingHorizontal: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { maxHeight: '85%', backgroundColor: colors.bgElevated, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderColor: colors.border, borderWidth: 1, padding: spacing.lg },
  close: { width: MIN_HIT_TARGET, height: MIN_HIT_TARGET, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: MIN_HIT_TARGET, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 90, alignItems: 'center', paddingHorizontal: spacing.lg },
  toast: { backgroundColor: colors.bgElevated, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxWidth: 480 },
})
