import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatFlightLevel, isLeg } from '@aerofms/shared'
import type { FmsEvent, FmsState } from '@aerofms/core'
import { GLOSSARY } from '@aerofms/training'
import { Button, Segmented, Sheet } from '@/components/common/UI'
import { colors, fonts, ui } from '@/theme'
import { useFms } from '@/stores/fms'
import { track } from '@/services/analytics'

const RATES = [1, 2, 4, 8, 16] as const

export function SimulationPanel() {
  const { t } = useTranslation()
  const state = useFms((s) => s.state)
  const dispatch = useFms((s) => s.dispatch)
  if (!state) return null
  const sim = state.simulation
  const plan = state.activeFlightPlan
  const canStart = (sim.status === 'IDLE' || sim.status === 'COMPLETED') && !!plan.origin && plan.elements.filter(isLeg).length >= 2 && (plan.activated || state.aircraft.manufacturer === 'AIRBUS')
  const c = (kind: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET' | 'GO_AROUND') => {
    dispatch({ type: 'SIM_CONTROL', control: { kind } })
    if (kind === 'START') track('simulation_started', { aircraft_id: state.aircraft.aircraftId })
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.h2}>{t('emulator.simulation')}</Text>
        <Text style={{ color: sim.status === 'RUNNING' ? colors.success : colors.textMuted }}>{t(`emulator.simStatus.${sim.status}`)}</Text>
      </View>
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        {(sim.status === 'IDLE' || sim.status === 'COMPLETED') && <Button small variant="primary" title={t('emulator.simStart')} disabled={!canStart} onPress={() => c('START')} />}
        {sim.status === 'RUNNING' && <Button small title={t('emulator.simPause')} onPress={() => c('PAUSE')} />}
        {sim.status === 'PAUSED' && <Button small variant="primary" title={t('emulator.simResume')} onPress={() => c('RESUME')} />}
        {(sim.status === 'RUNNING' || sim.status === 'PAUSED') && <Button small title={t('emulator.simStop')} onPress={() => c('STOP')} />}
        {state.flightPhase === 'APPROACH' && <Button small title={t('emulator.simGoAround')} onPress={() => c('GO_AROUND')} />}
        {sim.status === 'COMPLETED' && <Button small variant="ghost" title={t('emulator.simReset')} onPress={() => c('RESET')} />}
      </View>
      {!canStart && sim.status === 'IDLE' ? <Text style={ui.faint}>{t('emulator.simNeedsRoute')}</Text> : null}
      <Segmented
        label={t('emulator.simRate')}
        value={String(sim.timeScale)}
        options={RATES.map((r) => ({ value: String(r), label: `${r}×` }))}
        onChange={(v) => dispatch({ type: 'SIM_CONTROL', control: { kind: 'SET_SPEED', timeScale: Number(v) as 1 | 2 | 4 | 8 | 16 } })}
      />
    </View>
  )
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%', borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 8, backgroundColor: colors.surface }}>
      <Text style={ui.label}>{label}</Text>
      <Text style={[ui.mono, { fontSize: 14, marginTop: 2 }]}>{value}</Text>
    </View>
  )
}

export function FlightDataPanel({ state }: { state: FmsState }) {
  const { t } = useTranslation()
  const p = state.position
  const s = state.simulation
  const active = state.activeFlightPlan.elements[state.activeFlightPlan.activeLegIndex]
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.h2}>{t('emulator.flightData')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Datum label={t('emulator.phase')} value={t(`phase.${state.flightPhase}`)} />
        <Datum label={t('emulator.altitude')} value={`${formatFlightLevel(p.altitudeFt, state.performance.transitionAltitudeFt ?? 18000)} ft`} />
        <Datum label={t('emulator.groundSpeed')} value={`${Math.round(p.groundSpeedKt)} kt`} />
        <Datum label={t('emulator.airspeed')} value={`${Math.round(s.indicatedAirspeedKt)} / M${s.mach.toFixed(2)}`} />
        <Datum label={t('emulator.verticalSpeed')} value={`${s.verticalSpeedFpm} fpm`} />
        <Datum label={t('emulator.heading')} value={`${String(Math.round(p.headingTrue)).padStart(3, '0')}°T`} />
        <Datum label={t('emulator.fuel')} value={`${(((s.status === 'IDLE' ? state.performance.fuelKg : s.fuelKg) ?? 0) / 1000).toFixed(1)} t`} />
        <Datum label={t('emulator.distanceToGo')} value={`${Math.round(state.guidance.distanceToDestinationNm)} NM`} />
        <Datum label={t('emulator.activeWaypoint')} value={isLeg(active) ? active.waypoint.ident : '—'} />
        <Datum label={`${t('emulator.lnav')}/${t('emulator.vnav')}`} value={`${state.guidance.lnav}/${state.guidance.vnav}`} />
      </View>
    </View>
  )
}

export function EventRow({ e }: { e: FmsEvent }) {
  const { t } = useTranslation()
  const tone = e.type === 'ERROR' ? colors.danger : e.type === 'EXEC' || e.type === 'INSERT' ? colors.success : colors.textMuted
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
      <Text style={[ui.mono, { color: colors.textFaint, fontSize: 11, width: 62 }]}>{new Date(e.t).toLocaleTimeString([], { hour12: false })}</Text>
      <Text style={{ color: tone, fontSize: 12, width: 82 }}>{t(`replay.event.${e.type}`)}</Text>
      <Text style={[ui.mono, { fontSize: 12, flex: 1 }]} numberOfLines={1}>
        {e.detail}
        {e.value !== undefined && e.value !== null && e.value !== '' ? ` ${String(e.value)}` : ''}
      </Text>
    </View>
  )
}

export function TimelinePanel() {
  const { t } = useTranslation()
  const events = useFms((s) => s.eventLog)
  const visible = events.slice(-60).reverse()
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.h2}>{t('emulator.timeline')}</Text>
      {visible.length === 0 ? <Text style={ui.faint}>—</Text> : visible.map((e, i) => <EventRow key={`${e.actionIndex}-${i}`} e={e} />)}
    </View>
  )
}

/** Explain Mode sheet: short/detail/example/caution/related. */
export function ExplainSheet({ explainKey, onClose, onNavigate }: { explainKey: string | null; onClose: () => void; onNavigate: (k: string) => void }) {
  const { t } = useTranslation()
  const g = explainKey ? GLOSSARY[explainKey] : undefined
  return (
    <Sheet visible={!!explainKey} title={g && explainKey ? t(`explain.${explainKey}.title`) : t('explain.title')} onClose={onClose}>
      {!g || !explainKey ? (
        <Text style={ui.muted}>{t('explain.notFound')}</Text>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={ui.body}>{t(`explain.${explainKey}.short`)}</Text>
          <Text style={ui.label}>{t('explain.detail')}</Text>
          <Text style={ui.muted}>{t(`explain.${explainKey}.detail`)}</Text>
          {g.hasExample ? (
            <>
              <Text style={ui.label}>{t('explain.example')}</Text>
              <Text style={{ fontFamily: fonts.mono, color: colors.cdu.green, backgroundColor: colors.cdu.screen, padding: 8, borderRadius: 4 }}>{t(`explain.${explainKey}.example`)}</Text>
            </>
          ) : null}
          {g.hasCaution ? (
            <View style={{ borderColor: colors.warning, borderWidth: 1, borderRadius: 6, padding: 10 }}>
              <Text style={[ui.label, { color: colors.warning }]}>{t('explain.caution')}</Text>
              <Text style={ui.muted}>{t(`explain.${explainKey}.caution`)}</Text>
            </View>
          ) : null}
          {g.related.length ? (
            <>
              <Text style={ui.label}>{t('explain.related')}</Text>
              <View style={[ui.row, { flexWrap: 'wrap' }]}>
                {g.related.map((r) => (
                  <Button key={r} small title={t(`explain.${r}.title`)} onPress={() => onNavigate(r)} />
                ))}
              </View>
            </>
          ) : null}
        </View>
      )}
    </Sheet>
  )
}
