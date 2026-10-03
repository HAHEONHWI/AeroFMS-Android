import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatDurationHm, formatFlightLevel, isLeg, kgToLb, lbToKg, legDetail, unitPreferences } from '@aerofms/shared'
import { computeVnavProfile, displayedPerformance, displayedPlan, hasModification, procedureRunways } from '@aerofms/core'
import type { FmsCommand, FmsState } from '@aerofms/core'
import { Button, Card, Field, Select, toast } from '@/components/common/UI'
import { colors, fonts, ui } from '@/theme'
import { services } from '@/services/runtime'
import { useFms } from '@/stores/fms'
import { useSettings } from '@/stores/settings'

function useCommand() {
  const dispatch = useFms((s) => s.dispatch)
  return (command: FmsCommand): boolean => {
    const events = dispatch({ type: 'COMMAND', command })
    const err = events.find((e) => e.type === 'ERROR')
    if (err) {
      const msg = events.find((e) => e.type === 'MESSAGE')
      toast(`${String(msg?.value ?? err.detail)}${err.value ? ` (${String(err.value)})` : ''}`, 'error')
      return false
    }
    return true
  }
}

/** Beginner-friendly view of the same FMS state (every edit goes through the FMS engine). */
export function ModernView({ state }: { state: FmsState }) {
  const { t } = useTranslation()
  const run = useCommand()
  const dispatch = useFms((s) => s.dispatch)
  const units = unitPreferences(useSettings((s) => s.settings.units))
  const nav = services().nav
  const adapter = services().registry.get(state.aircraft.aircraftId)
  const plan = displayedPlan(state)
  const perf = displayedPerformance(state)
  const [origin, setOrigin] = useState(plan.origin ?? '')
  const [dest, setDest] = useState(plan.destination ?? '')
  const [via, setVia] = useState('')
  const [to, setTo] = useState('')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const originAp = plan.origin ? nav.searchAirport(plan.origin) : undefined
  const destAp = plan.destination ? nav.searchAirport(plan.destination) : undefined
  const profile = adapter ? computeVnavProfile(plan, perf, adapter.performanceModel, nav) : undefined
  const weight = (kg: number | undefined) => (kg === undefined ? '' : units.weight === 'lb' ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg)} kg`)
  const toKg = (v: string) => {
    const n = Number(v.replace(/,/g, ''))
    return Number.isFinite(n) ? String(Math.round(units.weight === 'lb' ? lbToKg(n) : n)) : v
  }
  const boeing = state.aircraft.manufacturer === 'BOEING'
  const none = { value: '', label: t('modern.none') }
  const proc = (id?: string) => (id ? nav.getProcedure(id) : undefined)

  const perfField = (key: 'SET_CRUISE_ALTITUDE' | 'SET_COST_INDEX' | 'SET_ZFW' | 'SET_FUEL' | 'SET_RESERVES', label: string, current: string, isWeight = false) => (
    <View key={key} style={[ui.row, { alignItems: 'flex-end' }]}>
      <View style={{ flex: 1 }}>
        <Field label={label} value={draft[key] ?? ''} placeholder={current || '—'} keyboardType="numbers-and-punctuation" onChangeText={(v) => setDraft({ ...draft, [key]: v })} />
      </View>
      <Button
        title={t('modern.apply')}
        disabled={!draft[key]}
        onPress={() => {
          if (run({ kind: key, value: isWeight ? toKg(draft[key] ?? '') : (draft[key] ?? '') })) setDraft({ ...draft, [key]: '' })
        }}
      />
    </View>
  )

  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.muted}>{t('modern.subtitle')}</Text>
      {hasModification(state) ? (
        <View style={{ borderWidth: 1, borderColor: colors.warning, borderRadius: 8, padding: 10, gap: 8 }}>
          <Text style={ui.body}>{boeing ? t('modern.pendingBoeing') : t('modern.pendingAirbus')}</Text>
          <View style={ui.row}>
            <Button small variant="ghost" title={t('modern.erase')} onPress={() => run({ kind: 'ERASE' })} />
            <Button small variant="primary" title={boeing ? t('modern.execute') : t('modern.insert')} onPress={() => run({ kind: 'EXECUTE' })} />
          </View>
        </View>
      ) : null}
      {!state.position.initialized && plan.origin ? <Button title={t('modern.position')} onPress={() => run({ kind: 'SET_POSITION_FROM_AIRPORT', icao: plan.origin ?? '' })} /> : null}
      <Card>
        <Text style={ui.h2}>{t('modern.route')}</Text>
        <View style={[ui.row, { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <Field label={t('modern.origin')} value={origin} maxLength={4} autoCapitalize="characters" onChangeText={(v) => setOrigin(v.toUpperCase())} />
          </View>
          <Button title={t('modern.apply')} disabled={origin.length !== 4 || origin === plan.origin} onPress={() => run({ kind: 'SET_ORIGIN', icao: origin })} />
        </View>
        <View style={[ui.row, { alignItems: 'flex-end' }]}>
          <View style={{ flex: 1 }}>
            <Field label={t('modern.destination')} value={dest} maxLength={4} autoCapitalize="characters" onChangeText={(v) => setDest(v.toUpperCase())} />
          </View>
          <Button title={t('modern.apply')} disabled={dest.length !== 4 || dest === plan.destination} onPress={() => run({ kind: 'SET_DESTINATION', icao: dest })} />
        </View>
        {originAp ? (
          <Select label={t('modern.runway')} value={plan.departureRunway ?? ''} onChange={(v) => v && run({ kind: 'SET_DEPARTURE_RUNWAY', runway: v })} options={[{ value: '', label: '—' }, ...originAp.runways.map((r) => ({ value: r.ident, label: r.ident }))]} />
        ) : null}
        {originAp ? (
          <Select
            label={t('modern.sid')}
            value={plan.sid?.id ?? ''}
            onChange={(v) => run({ kind: 'SET_SID', procedureId: v || null })}
            options={[none, ...nav.getDepartures(originAp.icao).filter((p) => !plan.departureRunway || procedureRunways(p, originAp).includes(plan.departureRunway)).map((p) => ({ value: p.id, label: p.name }))]}
          />
        ) : null}
        {proc(plan.sid?.id)?.transitions.length ? (
          <Select
            label={`${t('modern.sid')} ${t('modern.transition')}`}
            value={plan.sid?.transition ?? ''}
            onChange={(v) => plan.sid && run({ kind: 'SET_SID', procedureId: plan.sid.id, transition: v || undefined })}
            options={[none, ...(proc(plan.sid?.id)?.transitions ?? []).map((x) => ({ value: x.name, label: x.name }))]}
          />
        ) : null}
        {destAp ? <Select label={t('modern.star')} value={plan.star?.id ?? ''} onChange={(v) => run({ kind: 'SET_STAR', procedureId: v || null })} options={[none, ...nav.getArrivals(destAp.icao).map((p) => ({ value: p.id, label: p.name }))]} /> : null}
        {proc(plan.star?.id)?.transitions.length ? (
          <Select
            label={`${t('modern.star')} ${t('modern.transition')}`}
            value={plan.star?.transition ?? ''}
            onChange={(v) => plan.star && run({ kind: 'SET_STAR', procedureId: plan.star.id, transition: v || undefined })}
            options={[none, ...(proc(plan.star?.id)?.transitions ?? []).map((x) => ({ value: x.name, label: x.name }))]}
          />
        ) : null}
        {destAp ? <Select label={t('modern.approach')} value={plan.approach?.id ?? ''} onChange={(v) => run({ kind: 'SET_APPROACH', procedureId: v || null })} options={[none, ...nav.getApproaches(destAp.icao).map((p) => ({ value: p.id, label: p.name }))]} /> : null}
        {proc(plan.approach?.id)?.transitions.length ? (
          <Select
            label={`${t('modern.approach')} ${t('modern.transition')}`}
            value={plan.approach?.transition ?? ''}
            onChange={(v) => plan.approach && run({ kind: 'SET_APPROACH', procedureId: plan.approach.id, transition: v || undefined })}
            options={[none, ...(proc(plan.approach?.id)?.transitions ?? []).map((x) => ({ value: x.name, label: x.name }))]}
          />
        ) : null}
        <Field label={t('modern.via')} value={via} placeholder="DIRECT" autoCapitalize="characters" onChangeText={(v) => setVia(v.toUpperCase())} />
        <Field label={t('modern.to')} value={to} autoCapitalize="characters" onChangeText={(v) => setTo(v.toUpperCase())} />
        <Button
          variant="primary"
          title={t('modern.add')}
          disabled={!to}
          onPress={() => {
            if (run({ kind: 'APPEND_ROUTE', via: via || 'DIRECT', to })) {
              setVia('')
              setTo('')
            }
          }}
        />
        {boeing && !state.activeFlightPlan.activated && plan.origin && plan.destination ? <Button title={t('modern.activateRoute')} onPress={() => run({ kind: 'ACTIVATE_ROUTE' })} /> : null}
      </Card>
      <Card>
        <Text style={ui.h2}>{t('modern.legs')}</Text>
        {plan.elements.length === 0 ? <Text style={ui.muted}>{t('modern.noLegs')}</Text> : null}
        {plan.elements.map((e, i) =>
          isLeg(e) ? (
            <View key={e.id} style={[ui.row, { justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6, opacity: e.missed ? 0.6 : 1 }]}>
              <Pressable style={{ flex: 1 }} onPress={() => dispatch({ type: 'HIGHLIGHT_LEG', legId: e.id })} accessibilityRole="button">
                <Text style={{ fontFamily: fonts.monoSemi, color: i === plan.activeLegIndex ? colors.cdu.magenta : colors.text }}>{e.waypoint.ident}</Text>
                <Text style={ui.faint}>{legDetail(e, profile?.legs.find((p) => p.legId === e.id)?.altitudeFt, perf.transitionAltitudeFt ?? 18000)}</Text>
              </Pressable>
              {i > 0 && e.segment !== 'ORIGIN' && !e.missed ? (
                <View style={ui.row}>
                  <Button small variant="ghost" title={t('modern.directTo')} onPress={() => run({ kind: 'DIRECT_TO', ident: e.waypoint.ident })} />
                  {e.segment !== 'DESTINATION' ? <Button small variant="ghost" title={t('modern.deleteLeg')} onPress={() => run({ kind: 'DELETE_LEG', legId: e.id })} /> : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View key={e.id} style={[ui.row, { justifyContent: 'space-between', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.warning, borderRadius: 6, padding: 8 }]}>
              <Text style={{ color: colors.warning }}>{t('modern.discontinuity')}</Text>
              <Button small title={t('modern.closeDiscontinuity')} onPress={() => run({ kind: 'CLOSE_DISCONTINUITY', discontinuityId: e.id })} />
            </View>
          ),
        )}
      </Card>
      <Card>
        <Text style={ui.h2}>{t('modern.performance')}</Text>
        {perfField('SET_CRUISE_ALTITUDE', t('modern.cruiseAltitude'), perf.cruiseAltitudeFt ? formatFlightLevel(perf.cruiseAltitudeFt, 0) : '')}
        {perfField('SET_COST_INDEX', t('modern.costIndex'), perf.costIndex !== undefined ? String(perf.costIndex) : '')}
        {perfField('SET_ZFW', `${t('modern.zfw')} (${units.weight})`, weight(perf.zfwKg), true)}
        {perfField('SET_FUEL', `${t('modern.fuel')} (${units.weight})`, weight(perf.fuelKg), true)}
        {perfField('SET_RESERVES', `${t('modern.reserves')} (${units.weight})`, weight(perf.reserveFuelKg), true)}
      </Card>
      {profile?.valid ? (
        <Card>
          <Text style={ui.h2}>{t('modern.predictions')}</Text>
          {profile.unableCruiseAltitude ? <Text style={{ color: colors.warning }}>{t('modern.unableCrz')}</Text> : null}
          <Text style={ui.body}>
            {t('modern.distance')}: {Math.round(profile.totalDistanceNm)} NM · {t('modern.tripTime')}: {formatDurationHm(profile.tripTimeMin)}
          </Text>
          <Text style={ui.body}>
            {t('modern.toc')}: {profile.topOfClimb ? `${Math.round(profile.topOfClimb.distanceNm)} NM` : '—'} · {t('modern.tod')}: {profile.topOfDescent ? `${Math.round(profile.topOfDescent.distanceNm)} NM` : '—'}
          </Text>
          <Text style={ui.body}>
            {t('modern.tripFuel')}: {weight(profile.tripFuelKg) || '—'} · {t('modern.destFuel')}: {weight(profile.destinationFuelKg) || '—'}
          </Text>
        </Card>
      ) : null}
    </View>
  )
}
