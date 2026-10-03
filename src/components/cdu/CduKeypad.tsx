import { Pressable, Text, View } from 'react-native'
import type { KeyDefinition, KeypadLayout } from '@aerofms/core'
import { colors } from '@/theme'

interface Props {
  layout: KeypadLayout
  onKey: (key: string, long: boolean) => void
  execLit: boolean
  highlightKeys?: string[]
  keyHeight: number
  gap: number
}

function Key({ k, onKey, lit, highlighted, height }: { k: KeyDefinition; onKey: Props['onKey']; lit: boolean; highlighted: boolean; height: number }) {
  const isFn = k.role !== 'char' && k.role !== 'clear' && k.role !== 'delete'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={k.label}
      onPress={() => onKey(k.id, false)}
      onLongPress={k.id === 'CLR' ? () => onKey(k.id, true) : undefined}
      delayLongPress={550}
      style={({ pressed }) => ({
        flex: 1,
        height,
        borderRadius: 5,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? colors.cdu.yellow : colors.cdu.keyBorder,
        backgroundColor: pressed ? colors.cdu.keyPressed : colors.cdu.key,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {k.light ? <View style={{ position: 'absolute', top: 3, width: 22, height: 3, borderRadius: 2, backgroundColor: lit ? colors.cdu.execLight : 'rgba(0,0,0,0.4)' }} /> : null}
      <Text allowFontScaling={false} numberOfLines={2} style={{ color: colors.cdu.keyText, fontSize: isFn ? Math.min(11, height * 0.26) : Math.min(16, height * 0.42), fontWeight: '600', textAlign: 'center' }}>
        {isFn ? k.label.replace(' ', '\n') : k.label}
      </Text>
    </Pressable>
  )
}

function Grid({ keys, columns, rows, ...p }: Omit<Props, 'layout'> & { keys: KeyDefinition[]; columns: number; rows: number }) {
  const hl = new Set(p.highlightKeys ?? [])
  return (
    <View style={{ gap: p.gap }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: p.gap }}>
          {Array.from({ length: columns }, (_, c) => {
            const k = keys.find((x) => x.row === r && x.col === c)
            return k ? <Key key={c} k={k} onKey={p.onKey} lit={k.id === 'EXEC' && p.execLit} highlighted={hl.has(k.id)} height={p.keyHeight} /> : <View key={c} style={{ flex: 1 }} />
          })}
        </View>
      ))}
    </View>
  )
}

export function keypadRows(layout: KeypadLayout): number {
  const rowsOf = (id: string) => {
    const s = layout.sections.find((x) => x.id === id)
    return s ? Math.max(...s.keys.map((k) => k.row)) + 1 : 0
  }
  return rowsOf('function') + Math.max(rowsOf('alpha'), rowsOf('numeric'))
}

export function CduKeypad(props: Props) {
  const { layout } = props
  const sec = (id: string) => layout.sections.find((s) => s.id === id)
  const fn = sec('function')
  const alpha = sec('alpha')
  const num = sec('numeric')
  const rows = (s: typeof fn) => (s ? Math.max(...s.keys.map((k) => k.row)) + 1 : 0)
  return (
    <View style={{ gap: props.gap * 1.6 }}>
      {fn ? <Grid {...props} keys={fn.keys} columns={fn.columns} rows={rows(fn)} /> : null}
      <View style={{ flexDirection: 'row', gap: props.gap * 2 }}>
        {num ? (
          <View style={{ flex: 3 }}>
            <Grid {...props} keys={num.keys} columns={num.columns} rows={rows(num)} />
          </View>
        ) : null}
        {alpha ? (
          <View style={{ flex: 5 }}>
            <Grid {...props} keys={alpha.keys} columns={alpha.columns} rows={rows(alpha)} />
          </View>
        ) : null}
      </View>
    </View>
  )
}
