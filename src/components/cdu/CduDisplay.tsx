import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { DisplayCell, DisplayGrid, FieldBinding, FmsColor, LskSide } from '@aerofms/core'
import { colors, fonts } from '@/theme'

const COLOR: Record<FmsColor, string> = {
  white: colors.cdu.white,
  green: colors.cdu.green,
  cyan: colors.cdu.cyan,
  magenta: colors.cdu.magenta,
  amber: colors.cdu.amber,
  yellow: colors.cdu.yellow,
  red: colors.cdu.red,
  gray: colors.cdu.gray,
  blue: colors.cdu.blue,
}

interface Run {
  text: string
  color: FmsColor
  size: 'L' | 'S'
  inverse: boolean
}

function runs(cells: DisplayCell[]): Run[] {
  const out: Run[] = []
  for (const c of cells) {
    const last = out[out.length - 1]
    if (last && last.color === c.color && last.size === c.size && last.inverse === c.inverse) last.text += c.ch
    else out.push({ text: c.ch, color: c.color, size: c.size, inverse: c.inverse })
  }
  return out
}

export interface CduDisplayProps {
  grid: DisplayGrid
  fontSize: number
  rowHeight: number
  charWidth: number
  highlightedLegId?: string
  onLine?: (fields: Partial<Record<LskSide, FieldBinding>> | undefined) => void
}

/** Character-grid renderer: each cell occupies exactly one monospace column. */
export const CduDisplay = memo(function CduDisplay({ grid, fontSize, rowHeight, charWidth, highlightedLegId, onLine }: CduDisplayProps) {
  return (
    <View style={{ backgroundColor: colors.cdu.screen, borderRadius: 3, paddingHorizontal: charWidth * 0.35 }} accessibilityRole="text">
      {grid.lines.map((line, i) => {
        const legId = line.fields?.L?.legId ?? line.fields?.R?.legId
        const highlighted = !!legId && legId === highlightedLegId
        const content = (
          <View style={{ height: rowHeight, flexDirection: 'row', alignItems: 'center', backgroundColor: highlighted ? 'rgba(242,226,90,0.10)' : undefined }}>
            {runs(line.cells).map((r, j) => (
              <Text
                key={j}
                allowFontScaling={false}
                style={{
                  width: r.text.length * charWidth,
                  fontFamily: fonts.mono,
                  fontSize: r.size === 'S' ? fontSize * 0.78 : fontSize,
                  color: r.inverse ? colors.cdu.screen : COLOR[r.color],
                  backgroundColor: r.inverse ? colors.cdu.white : undefined,
                  includeFontPadding: false,
                }}
              >
                {r.text}
              </Text>
            ))}
          </View>
        )
        return line.kind === 'data' && onLine && (line.fields?.L || line.fields?.R) ? (
          <Pressable key={i} accessibilityLabel={line.text.trim()} onPress={() => onLine(line.fields)}>
            {content}
          </Pressable>
        ) : (
          <View key={i} accessible accessibilityLabel={line.text.trim() || undefined}>
            {content}
          </View>
        )
      })}
    </View>
  )
})
