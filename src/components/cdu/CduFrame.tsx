import { useMemo, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { composeDisplay, pendingMessages } from '@aerofms/core'
import type { AircraftFmsAdapter, FieldBinding, FmsActionInput, FmsState, LskId, LskSide } from '@aerofms/core'
import type { NavigationProvider } from '@aerofms/navigation'
import { colors } from '@/theme'
import { useSettings } from '@/stores/settings'
import { CduDisplay } from './CduDisplay'
import { CduKeypad, keypadRows } from './CduKeypad'
import { keyFeedback } from './feedback'

export interface CduFrameProps {
  state: FmsState
  adapter: AircraftFmsAdapter
  nav: NavigationProvider
  width: number
  /** Height budget; the display and keys shrink to fit without scrolling. */
  maxHeight: number
  dispatch?: (a: FmsActionInput) => void
  highlightKeys?: string[]
  highlightLsk?: LskId[]
  explainMode?: boolean
  onExplain?: (b: FieldBinding) => void
  readOnly?: boolean
}

const ROWS = [1, 2, 3, 4, 5, 6] as const
/** IBM Plex Mono advance width (em). */
const ADVANCE = 0.6

export function CduFrame(p: CduFrameProps) {
  const { t } = useTranslation()
  const settings = useSettings((s) => s.settings)
  const page = useMemo(() => p.adapter.renderPage(p.state, p.nav), [p.adapter, p.state, p.nav])
  const grid = useMemo(() => composeDisplay(page, p.adapter.scratchpadDisplay(p.state), p.adapter.display.columns), [page, p.adapter, p.state])
  const pad = 8
  const lskW = Math.max(30, Math.min(44, p.width * 0.09))
  const screenW = p.width - 2 * lskW - 2 * pad - 8
  let fontSize = Math.min(24, screenW / (24 * ADVANCE + 0.7))
  const layout = p.adapter.getKeypad()
  const kRows = keypadRows(layout)
  const gap = 5
  // Fit display + keypad in the height budget (portrait phones).
  let rowH = Math.round(fontSize * 1.3)
  let keyH = 40
  if (!p.readOnly) {
    const available = p.maxHeight - 2 * pad - 22
    const keysBudget = available - 14 * rowH
    keyH = Math.floor((keysBudget - (kRows + 2) * gap) / kRows)
    if (keyH < 30) {
      keyH = 30
      const displayBudget = available - (kRows * keyH + (kRows + 2) * gap)
      rowH = Math.max(12, Math.floor(displayBudget / 14))
      fontSize = Math.min(fontSize, rowH / 1.3)
    }
    keyH = Math.min(keyH, 50)
  }
  // Half-pixel font sizes keep the measured glyph advance at or below the column width.
  fontSize = Math.floor(fontSize * 2) / 2
  const charW = fontSize * ADVANCE
  const execLit = p.adapter.isExecPending(p.state)
  const msgLit = pendingMessages(p.state).length > 0
  const hl = new Set(p.highlightLsk ?? [])
  const longFired = useRef(false)

  const send = (a: FmsActionInput) => {
    if (p.readOnly || !p.dispatch) return
    keyFeedback(settings.sound, settings.haptic)
    p.dispatch(a)
  }
  const fieldOf = (lsk: LskId) => page.rows[Number(lsk[0]) - 1]?.fields?.[lsk[1] as LskSide]
  const pressLsk = (lsk: LskId) => {
    if (longFired.current) return
    if (p.explainMode) {
      const b = fieldOf(lsk)
      if (b) p.onExplain?.(b)
      return
    }
    send({ type: 'LSK', lsk })
  }
  const lsk = (id: LskId) => (
    <Pressable
      key={id}
      accessibilityRole="button"
      accessibilityLabel={t('emulator.lsk', { id })}
      disabled={p.readOnly}
      onPressIn={() => (longFired.current = false)}
      onPress={() => pressLsk(id)}
      onLongPress={() => {
        const b = fieldOf(id)
        if (b && p.onExplain) {
          longFired.current = true
          p.onExplain(b)
        }
      }}
      style={({ pressed }) => ({
        height: Math.min(rowH * 1.4, 32),
        width: lskW,
        borderRadius: 4,
        borderWidth: hl.has(id) ? 2 : 1,
        borderColor: hl.has(id) ? colors.cdu.yellow : colors.cdu.keyBorder,
        backgroundColor: pressed ? colors.cdu.keyPressed : colors.cdu.key,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={{ color: colors.cdu.gray, fontSize: 10 }}>—</Text>
    </Pressable>
  )
  const airbus = p.adapter.manufacturer === 'AIRBUS'
  return (
    <View style={{ width: p.width, padding: pad, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: airbus ? '#1d2430' : colors.cdu.bezel, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
        <View style={{ width: lskW, height: 14 * rowH }}>
          {ROWS.map((r) => (
            <View key={r} style={{ position: 'absolute', top: rowH * (r * 2) - (Math.min(rowH * 1.4, 32) - rowH) / 2 }}>
              {lsk(`${r}L` as LskId)}
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <CduDisplay
            grid={grid}
            fontSize={fontSize}
            rowHeight={rowH}
            charWidth={charW}
            highlightedLegId={p.state.navigation.highlightedLegId}
            onLine={(fields) => {
              if (p.explainMode) {
                const b = fields?.L ?? fields?.R
                if (b) p.onExplain?.(b)
                return
              }
              const legId = fields?.L?.legId ?? fields?.R?.legId
              if (legId && !p.readOnly) p.dispatch?.({ type: 'HIGHLIGHT_LEG', legId })
            }}
          />
        </View>
        <View style={{ width: lskW, height: 14 * rowH }}>
          {ROWS.map((r) => (
            <View key={r} style={{ position: 'absolute', top: rowH * (r * 2) - (Math.min(rowH * 1.4, 32) - rowH) / 2 }}>
              {lsk(`${r}R` as LskId)}
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, height: 14 }}>
        <Text style={{ color: msgLit ? colors.cdu.amber : 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '700' }}>{airbus ? 'FM' : 'MSG'}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{p.adapter.definition.systemLabel}</Text>
        <Text style={{ color: colors.cdu.white, fontSize: 10, opacity: execLit ? 1 : 0 }} accessibilityElementsHidden={!execLit}>{t('emulator.execPending')}</Text>
      </View>
      {!p.readOnly ? (
        <CduKeypad layout={layout} execLit={execLit} highlightKeys={p.highlightKeys} keyHeight={keyH} gap={gap} onKey={(key, long) => send(long ? { type: 'KEY_LONG', key } : { type: 'KEY', key })} />
      ) : null}
    </View>
  )
}
