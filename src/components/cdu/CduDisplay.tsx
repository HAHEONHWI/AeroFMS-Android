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

/** Glyphs missing from IBM Plex Mono; drawn one cell at a time so a fallback font cannot shift the grid. */
const OUTSIDE_FONT = new Set(['□', 'Δ'])

export function runs(cells: DisplayCell[]): (Run & { col: number })[] {
  const out: (Run & { col: number })[] = []
  cells.forEach((c, col) => {
    const last = out[out.length - 1]
    const single = OUTSIDE_FONT.has(c.ch)
    if (!single && last && !OUTSIDE_FONT.has(last.text) && last.color === c.color && last.size === c.size && last.inverse === c.inverse) last.text += c.ch
    else out.push({ text: c.ch, color: c.color, size: c.size, inverse: c.inverse, col })
  })
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
          <View style={{ height: rowHeight, width: line.cells.length * charWidth, backgroundColor: highlighted ? 'rgba(242,226,90,0.10)' : undefined }}>
            {runs(line.cells).map((r, j) => {
              const size = r.size === 'S' ? fontSize * 0.78 : fontSize
              if (r.text === '□') {
                // Entry box: drawn as an outlined square so it keeps the column width exactly.
                const box = Math.min(charWidth * 0.82, size * 0.62)
                return (
                  <View
                    key={j}
                    style={{ position: 'absolute', left: r.col * charWidth + (charWidth - box) / 2, top: (rowHeight - box) / 2, width: box, height: box, borderWidth: 1.2, borderColor: COLOR[r.color] }}
                  />
                )
              }
              return r.text.trim() === '' && !r.inverse ? null : (
                <Text
                  key={j}
                  allowFontScaling={false}
                  // Each run sits on its own column; one column of slack lets the last glyph render even when
                  // the font's measured advance is a hair wider than the grid (Android drops clipped glyphs).
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  style={{
                    position: 'absolute',
                    left: r.col * charWidth,
                    top: 0,
                    height: rowHeight,
                    width: (r.text.length + (r.inverse || OUTSIDE_FONT.has(r.text) ? 0 : 1)) * charWidth,
                    textAlign: OUTSIDE_FONT.has(r.text) ? 'center' : 'left',
                    textAlignVertical: 'center',
                    lineHeight: rowHeight,
                    fontFamily: OUTSIDE_FONT.has(r.text) ? undefined : fonts.mono,
                    fontSize: size,
                    color: r.inverse ? colors.cdu.screen : COLOR[r.color],
                    backgroundColor: r.inverse ? colors.cdu.white : undefined,
                    includeFontPadding: false,
                  }}
                >
                  {r.text}
                </Text>
              )
            })}
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
