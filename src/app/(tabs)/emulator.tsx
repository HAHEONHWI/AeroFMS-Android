import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import type { FieldBinding } from '@aerofms/core'
import { lessonById, scenarioById } from '@aerofms/training'
import { CduFrame } from '@/components/cdu/CduFrame'
import { FlightMapSvg } from '@/components/map/FlightMapSvg'
import { ModernView } from '@/components/emulator/ModernView'
import { ExplainSheet, FlightDataPanel, SimulationPanel, TimelinePanel } from '@/components/emulator/Panels'
import { AircraftPicker, SessionSheet, SwitchAircraftSheet } from '@/components/emulator/SessionSheets'
import { ConnectorPanel } from '@/components/emulator/ConnectorPanel'
import { TrainingOverlay } from '@/components/training/TrainingOverlay'
import { Segmented, Sheet } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { services } from '@/services/runtime'
import { useFms } from '@/stores/fms'
import { useSettings } from '@/stores/settings'
import { useTraining } from '@/stores/training'
import { useLocalized } from '@/i18n'
import { useAdFreeContext } from '@/platform/ads'

type Panel = 'map' | 'data' | 'training' | 'timeline' | 'connector'

export default function EmulatorScreen() {
  const { t } = useTranslation()
  const L = useLocalized()
  const params = useLocalSearchParams<{ aircraft?: string; lesson?: string; scenario?: string; session?: string }>()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { state, engine, status, dispatch, openAircraft, openSession } = useFms()
  const { settings, update } = useSettings()
  const training = useTraining()
  useTraining((s) => s.revision)
  const [explainMode, setExplainMode] = useState(false)
  const [explainKey, setExplainKey] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>('map')
  const [sheet, setSheet] = useState<'panel' | 'sessions' | 'aircraft' | 'training' | null>(null)
  const [switchTarget, setSwitchTarget] = useState<string | null>(null)
  useAdFreeContext(training.active ? 'TRAINING_ACTIVE' : 'EMULATOR')

  useEffect(() => {
    if (params.lesson) {
      const l = lessonById(params.lesson)
      if (l) void training.startLesson(l)
      router.setParams({ lesson: undefined })
    } else if (params.scenario) {
      const id = params.scenario
      const s = scenarioById(id)
      if (s) void training.startScenario(s)
      else void services().scenarios.get(id).then((r) => r && training.startScenario(r.doc, { cloud: r.source === 'CLOUD' }))
      router.setParams({ scenario: undefined })
    } else if (params.session) {
      void openSession(params.session)
      router.setParams({ session: undefined })
    } else if (params.aircraft) {
      // A different aircraft than the open session is confirmed through the switch sheet (paramSwitch below).
      if (!state) {
        void openAircraft(params.aircraft)
        router.setParams({ aircraft: undefined })
      } else if (state.aircraft.aircraftId === params.aircraft) router.setParams({ aircraft: undefined })
    } else if (!state && status === 'idle') {
      void services()
        .sessions.currentSessionId()
        .then(async (id) => {
          if (id && (await openSession(id)) === 'ok') return
          setSheet('aircraft')
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lesson, params.scenario, params.session, params.aircraft])

  const paramSwitch = params.aircraft && state && state.aircraft.aircraftId !== params.aircraft ? params.aircraft : null
  const closeSwitch = () => {
    setSwitchTarget(null)
    if (params.aircraft) router.setParams({ aircraft: undefined })
  }
  const wide = width >= 700 || width > height
  const step = training.active?.kind === 'LESSON' ? training.active.runner.currentStep : undefined
  const onExplain = (b: FieldBinding) => b.explainKey && setExplainKey(b.explainKey)
  const panels = useMemo(
    () =>
      [
        { value: 'map' as Panel, label: t('nav.map') },
        { value: 'data' as Panel, label: t('emulator.flightData') },
        ...(training.active ? [{ value: 'training' as Panel, label: t('training.overlayTitle') }] : []),
        { value: 'timeline' as Panel, label: t('emulator.timeline') },
        { value: 'connector' as Panel, label: t('connector.title') },
      ],
    [t, training.active],
  )

  if (!state || !engine) {
    return (
      <SafeAreaView style={ui.screen}>
        <ScrollView contentContainerStyle={ui.content}>
          <Text style={ui.h1}>{t('aircraft.select')}</Text>
          {status === 'loading' ? <Text style={ui.muted}>{t('app.loading')}</Text> : <AircraftPicker onPick={(id) => void openAircraft(id)} />}
        </ScrollView>
      </SafeAreaView>
    )
  }

  const adapter = engine.adapter
  const nav = services().nav
  const toolbarH = 48
  const usableH = height - insets.top - insets.bottom - toolbarH - (training.active && !wide ? 56 : 0) - 12
  const cduWidth = wide ? Math.min(520, width * 0.5) : width - 12
  const panelWidth = width - cduWidth - 36 - insets.left - insets.right

  const panelContent = (w: number, h: number) => (
    <View style={{ gap: 12 }}>
      {panel === 'map' ? <FlightMapSvg state={state} nav={nav} adapter={adapter} width={w} height={h} showAirways={settings.mapAirways} onSelectLeg={(legId) => dispatch({ type: 'HIGHLIGHT_LEG', legId })} /> : null}
      {panel === 'map' || panel === 'data' ? <SimulationPanel /> : null}
      {panel === 'data' ? <FlightDataPanel state={state} /> : null}
      {panel === 'training' ? <TrainingOverlay onExit={() => setPanel('map')} /> : null}
      {panel === 'timeline' ? <TimelinePanel /> : null}
      {panel === 'connector' ? <ConnectorPanel /> : null}
    </View>
  )

  const main =
    settings.viewMode === 'MODERN' ? (
      <ScrollView style={{ width: cduWidth }} contentContainerStyle={{ paddingBottom: 24 }}>
        <ModernView state={state} />
      </ScrollView>
    ) : (
      <CduFrame
        state={state}
        adapter={adapter}
        nav={nav}
        width={cduWidth}
        maxHeight={usableH}
        dispatch={dispatch}
        explainMode={explainMode}
        onExplain={onExplain}
        highlightKeys={step?.highlightKeys}
        highlightLsk={step?.highlightLsk}
      />
    )

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ height: toolbarH, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4 }}>
        <IconButton name="chevron-back" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('aircraft.switchTitle')} onPress={() => setSheet('aircraft')} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
          <Text style={ui.h2} numberOfLines={1}>
            {adapter.definition.displayName}
          </Text>
          <Text style={ui.faint} numberOfLines={1}>
            {state.session.name}
          </Text>
        </Pressable>
        <IconButton name={settings.viewMode === 'CLASSIC' ? 'list-outline' : 'keypad-outline'} label={settings.viewMode === 'CLASSIC' ? t('emulator.modern') : t('emulator.classic')} onPress={() => update({ viewMode: settings.viewMode === 'CLASSIC' ? 'MODERN' : 'CLASSIC' })} />
        <IconButton name="information-circle-outline" label={t('emulator.explain')} active={explainMode} onPress={() => setExplainMode(!explainMode)} />
        <IconButton name="folder-open-outline" label={t('session.title')} onPress={() => setSheet('sessions')} />
        {!wide ? <IconButton name="map-outline" label={t('emulator.panel')} onPress={() => setSheet('panel')} /> : null}
      </View>
      {training.active && !wide ? (
        <Pressable onPress={() => setSheet('training')} accessibilityRole="button" style={{ marginHorizontal: 6, marginBottom: 6, minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: colors.accent, padding: 8, justifyContent: 'center' }}>
          <Text style={{ color: colors.text }} numberOfLines={2}>
            {training.active.kind === 'LESSON' ? (step ? L(step.instruction) : t('academy.lessonComplete')) : L(training.active.scenario.title)}
          </Text>
        </Pressable>
      ) : null}
      {explainMode ? <Text style={{ color: colors.accent, paddingHorizontal: 10, marginBottom: 4 }}>{t('emulator.explainOn')}</Text> : null}
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 6 }}>
          {main}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
            <Segmented label={t('emulator.panel')} value={panel} options={panels} onChange={setPanel} />
            {training.active && panel !== 'training' ? <TrainingOverlay onExit={() => setPanel('map')} /> : null}
            {panelContent(panelWidth, Math.max(240, height * 0.5))}
          </ScrollView>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>{main}</View>
      )}

      <Sheet visible={sheet === 'panel'} title={t('emulator.panel')} onClose={() => setSheet(null)}>
        <Segmented label={t('emulator.panel')} value={panel} options={panels} onChange={setPanel} />
        {panelContent(width - 32, height * 0.45)}
      </Sheet>
      <Sheet visible={sheet === 'training'} title={t('training.overlayTitle')} onClose={() => setSheet(null)}>
        <TrainingOverlay onExit={() => setSheet(null)} />
      </Sheet>
      <Sheet visible={sheet === 'aircraft'} title={t('aircraft.select')} onClose={() => setSheet(null)}>
        <AircraftPicker
          initial={state.aircraft.aircraftId}
          onPick={(id) => {
            setSheet(null)
            if (id !== state.aircraft.aircraftId) setSwitchTarget(id)
          }}
        />
      </Sheet>
      <SessionSheet visible={sheet === 'sessions'} onClose={() => setSheet(null)} />
      <SwitchAircraftSheet target={switchTarget ?? paramSwitch} onClose={closeSwitch} />
      <ExplainSheet explainKey={explainKey} onClose={() => setExplainKey(null)} onNavigate={setExplainKey} />
      {settings.viewMode === 'CLASSIC' && !wide ? null : <Text style={[ui.faint, { textAlign: 'center', paddingBottom: 4 }]}>{t('app.disclaimerShort')}</Text>}
    </SafeAreaView>
  )
}

function IconButton({ name, label, onPress, active }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: active ? colors.surfaceRaised : undefined }}>
      <Ionicons name={name} size={22} color={active ? colors.accent : colors.text} />
    </Pressable>
  )
}

