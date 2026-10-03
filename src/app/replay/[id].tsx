import { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CduFrame } from '@/components/cdu/CduFrame'
import { FlightMapSvg } from '@/components/map/FlightMapSvg'
import { EventRow } from '@/components/emulator/Panels'
import { Button, Segmented } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { services } from '@/services/runtime'
import { useAdFreeContext } from '@/platform/ads'
import { track } from '@/services/analytics'

const SPEEDS = ['0.5', '1', '2', '4'] as const

export default function ReplayPlayer() {
  const { t } = useTranslation()
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const { width } = useWindowDimensions()
  useAdFreeContext('REPLAY')
  const q = useQuery({ queryKey: ['replay', id], queryFn: () => services().sessions.loadReplay(id).then((r) => r ?? null) })
  const ctrl = q.data
  /** null = the final state (a replay opens at the end of the recording). */
  const [cursor, setCursor] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>('1')
  const pos = cursor ?? ctrl?.length ?? 0
  const delay = ctrl && playing ? ctrl.delayToNext(pos, Number(speed)) : undefined
  const isPlaying = delay !== undefined
  const setPos = (f: (p: number) => number) => setCursor((c) => f(c ?? ctrl?.length ?? 0))
  useEffect(() => {
    if (ctrl) track('replay_opened')
  }, [ctrl])
  useEffect(() => {
    if (!ctrl || delay === undefined) return
    const tm = setTimeout(() => setCursor((c) => Math.min(ctrl.length, (c ?? ctrl.length) + 1)), delay)
    return () => clearTimeout(tm)
  }, [delay, pos, ctrl])
  const state = useMemo(() => (ctrl ? ctrl.stateAt(pos) : undefined), [ctrl, pos])
  if (q.isLoading) return <Text style={[ui.muted, { padding: 16 }]}>{t('app.loading')}</Text>
  if (!ctrl || !state) return <Text style={[ui.muted, { padding: 16 }]}>{t('replay.notAvailable')}</Text>
  const adapter = services().registry.get(state.aircraft.aircraftId)
  if (!adapter) return null
  // Manual seeking pauses playback so a finished replay does not silently resume.
  const step = (delta: number) => {
    setPlaying(false)
    setPos((p) => Math.max(0, Math.min(ctrl.length, p + delta)))
  }
  const jump = (p: number) => {
    setPlaying(false)
    setCursor(p)
  }
  const errors = ctrl.markers.filter((m) => m.kind === 'ERROR')
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Stack.Screen options={{ title: state.session.name }} />
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <Button
          variant="primary"
          title={isPlaying ? t('replay.pause') : t('replay.play')}
          onPress={() => {
            if (!isPlaying && pos >= ctrl.length) setCursor(0)
            setPlaying(!isPlaying)
          }}
        />
        <Button small title="−10" onPress={() => step(-10)} />
        <Button small title="−1" onPress={() => step(-1)} />
        <Button small title="+1" onPress={() => step(1)} />
        <Button small title="+10" onPress={() => step(10)} />
      </View>
      <Segmented label={t('replay.speed')} value={speed} onChange={setSpeed} options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} />
      <Text style={ui.mono}>{t('replay.position', { current: pos, total: ctrl.length })}</Text>
      {/* Timeline bar with error markers (tap a marker to jump). */}
      <View style={{ height: 22, borderRadius: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(pos / Math.max(1, ctrl.length)) * 100}%`, backgroundColor: 'rgba(79,179,169,0.35)' }} />
        {ctrl.markers.map((m, i) => (
          <View key={i} style={{ position: 'absolute', top: 2, bottom: 2, width: 2, left: `${((m.actionIndex + 1) / Math.max(1, ctrl.length)) * 100}%`, backgroundColor: m.kind === 'ERROR' ? colors.danger : colors.success }} />
        ))}
      </View>
      {errors.length ? (
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          <Text style={ui.muted}>{t('replay.errors')}:</Text>
          {errors.slice(0, 10).map((m, i) => (
            <Button key={i} small variant="ghost" title={`#${m.actionIndex + 1} ${m.detail}`} onPress={() => jump(m.actionIndex + 1)} />
          ))}
        </View>
      ) : null}
      <CduFrame state={state} adapter={adapter} nav={services().nav} width={Math.min(width - 32, 520)} maxHeight={9999} readOnly />
      <FlightMapSvg state={state} nav={services().nav} adapter={adapter} width={width - 32} height={300} />
      <Text style={ui.h2}>{t('replay.events')}</Text>
      {ctrl.events
        .filter((e) => e.actionIndex < pos && e.type !== 'SIMULATION_EVENT')
        .slice(-30)
        .reverse()
        .map((e, i) => (
          <EventRow key={i} e={e} />
        ))}
    </ScrollView>
  )
}
