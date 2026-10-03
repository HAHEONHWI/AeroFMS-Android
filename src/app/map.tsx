import { useEffect } from 'react'
import { ScrollView, Text, useWindowDimensions } from 'react-native'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { FlightMapSvg } from '@/components/map/FlightMapSvg'
import { FlightDataPanel, SimulationPanel } from '@/components/emulator/Panels'
import { Toggle } from '@/components/common/UI'
import { ui } from '@/theme'
import { services } from '@/services/runtime'
import { useFms } from '@/stores/fms'
import { useSettings } from '@/stores/settings'

export default function MapScreen() {
  const { t } = useTranslation()
  const { width, height } = useWindowDimensions()
  const { state, engine, status, dispatch, openSession } = useFms()
  const { settings, update } = useSettings()
  useEffect(() => {
    if (!state && status === 'idle') void services().sessions.currentSessionId().then((id) => id && openSession(id))
  }, [state, status, openSession])
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Stack.Screen options={{ title: t('map.title') }} />
      {!state || !engine ? (
        <Text style={ui.muted}>{t('map.noRoute')}</Text>
      ) : (
        <>
          <FlightMapSvg state={state} nav={services().nav} adapter={engine.adapter} width={width - 32} height={Math.max(300, height * 0.55)} showAirways={settings.mapAirways} onSelectLeg={(legId) => dispatch({ type: 'HIGHLIGHT_LEG', legId })} />
          <Text style={ui.faint}>{t('map.selectHint')}</Text>
          <Toggle label={t('map.airways')} value={settings.mapAirways} onChange={(v) => update({ mapAirways: v })} />
          <SimulationPanel />
          <FlightDataPanel state={state} />
        </>
      )}
    </ScrollView>
  )
}
