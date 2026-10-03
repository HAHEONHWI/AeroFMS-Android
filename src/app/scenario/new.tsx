import { useState } from 'react'
import { Text, View } from 'react-native'
import { router, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { BUILDER_CONDITION_TYPES, briefingFromForm, builderObjective, conditionNeedsValue, createUserScenario, generateObjectives, validateScenario } from '@aerofms/training'
import type { BuilderConditionType, Difficulty, ScenarioObjective, ScenarioVisibility } from '@aerofms/training'
import { Button, Card, Field, Screen, SectionTitle, Select, toast } from '@/components/common/UI'
import { ui } from '@/theme'
import { services } from '@/services/runtime'
import { currentLanguage } from '@/i18n'
import { useAuth } from '@/stores/auth'

type FlightKey = 'initialAirport' | 'origin' | 'destination' | 'route' | 'runway' | 'sid' | 'star' | 'approach' | 'cruise' | 'fuel' | 'weight'

/** Scenario Builder: users define a flight, objectives and hints without writing code. */
export default function ScenarioBuilder() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const aircraft = services().registry.list()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [aircraftId, setAircraftId] = useState(aircraft[0]?.id ?? 'B737-800')
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM')
  const [language, setLanguage] = useState<'ko' | 'en'>(currentLanguage())
  const [visibility, setVisibility] = useState<ScenarioVisibility>('PRIVATE')
  const [flight, setFlight] = useState<Record<FlightKey, string>>({ initialAirport: '', origin: '', destination: '', route: '', runway: '', sid: '', star: '', approach: '', cruise: '', fuel: '', weight: '' })
  const [objectives, setObjectives] = useState<ScenarioObjective[]>([])
  const [hints, setHints] = useState<string[]>([])
  const [newObj, setNewObj] = useState<{ type: BuilderConditionType; value: string; text: string; points: string }>({ type: 'ORIGIN', value: '', text: '', points: '10' })

  const form = () => ({
    title,
    description,
    aircraftId,
    difficulty,
    language,
    visibility,
    ...flight,
    fuelKg: flight.fuel ? Number(flight.fuel) : undefined,
    zfwKg: flight.weight ? Number(flight.weight) : undefined,
  })
  const flightField = (k: FlightKey, numeric = false, placeholder?: string) => (
    <Field
      key={k}
      label={t(`scenarios.builder.${k}`)}
      value={flight[k]}
      placeholder={placeholder}
      autoCapitalize="characters"
      autoCorrect={false}
      keyboardType={numeric ? 'number-pad' : 'default'}
      maxLength={k === 'route' ? 400 : k === 'initialAirport' || k === 'origin' || k === 'destination' ? 4 : 12}
      onChangeText={(v) => setFlight({ ...flight, [k]: v.toUpperCase() })}
    />
  )

  const save = async () => {
    const v = validateScenario(createUserScenario(form(), objectives, hints, user ? { uid: user.uid, name: user.displayName } : undefined))
    if (!v.ok) {
      toast(t('scenarios.builder.invalid', { error: v.error }), 'error')
      return
    }
    await services().scenarios.save(v.scenario, 'LOCAL')
    toast(t('scenarios.builder.saved'), 'success')
    router.replace(`/scenario/${v.scenario.id}`)
  }

  const needsValue = conditionNeedsValue(newObj.type)
  return (
    <Screen edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: t('scenarios.builder.title') }} />
      <SectionTitle>{t('scenarios.builder.basic')}</SectionTitle>
      <Field label={t('scenarios.builder.titleLabel')} value={title} maxLength={120} onChangeText={setTitle} />
      <Field label={t('scenarios.builder.descriptionLabel')} value={description} maxLength={2000} multiline onChangeText={setDescription} />
      <Select label={t('scenarios.builder.aircraft')} value={aircraftId} onChange={setAircraftId} options={aircraft.map((a) => ({ value: a.id, label: a.displayName }))} />
      <Select label={t('scenarios.builder.difficulty')} value={difficulty} onChange={(v) => setDifficulty(v as Difficulty)} options={(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => ({ value: d, label: t(`difficulty.${d}`) }))} />
      <Select label={t('scenarios.builder.language')} value={language} onChange={(v) => setLanguage(v === 'ko' ? 'ko' : 'en')} options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]} />
      <Select label={t('scenarios.builder.visibility')} value={visibility} onChange={(v) => setVisibility(v as ScenarioVisibility)} options={(['PRIVATE', 'UNLISTED', 'PUBLIC'] as const).map((v) => ({ value: v, label: t(`scenarios.visibility.${v}`) }))} />

      <SectionTitle>{t('scenarios.builder.flight')}</SectionTitle>
      {flightField('initialAirport')}
      {flightField('origin')}
      {flightField('destination')}
      {flightField('route', false, 'BULTI Y711 OSN Y722 KALOD')}
      {flightField('runway')}
      {flightField('sid')}
      {flightField('star')}
      {flightField('approach')}
      {flightField('cruise', false, 'FL350')}
      {flightField('fuel', true)}
      {flightField('weight', true)}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionTitle>{t('scenarios.builder.objectives')}</SectionTitle>
        <Button small title={t('scenarios.builder.generateObjectives')} onPress={() => setObjectives(generateObjectives(briefingFromForm(form()), language, (x) => !!services().nav.getAirway(x)))} />
      </View>
      {objectives.map((o, i) => (
        <Card key={o.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[ui.body, { flex: 1 }]}>
            {i + 1}. {'text' in o.text ? o.text.text : ''} <Text style={ui.faint}>({o.points})</Text>
          </Text>
          <Button small variant="ghost" title={t('common.delete')} onPress={() => setObjectives(objectives.filter((x) => x.id !== o.id))} />
        </Card>
      ))}
      <Card style={{ gap: 8 }}>
        <Select label={t('scenarios.builder.objectiveType')} value={newObj.type} onChange={(v) => setNewObj({ ...newObj, type: v as BuilderConditionType })} options={BUILDER_CONDITION_TYPES.map((c) => ({ value: c, label: t(`scenarios.condition.${c}`) }))} />
        {needsValue ? <Field label={t('scenarios.builder.objectiveValue')} value={newObj.value} autoCapitalize="characters" onChangeText={(v) => setNewObj({ ...newObj, value: v })} /> : null}
        <Field label={t('scenarios.builder.objectiveText')} value={newObj.text} onChangeText={(v) => setNewObj({ ...newObj, text: v })} />
        <Field label={t('scenarios.builder.points')} value={newObj.points} keyboardType="number-pad" onChangeText={(v) => setNewObj({ ...newObj, points: v })} />
        <Button
          title={t('scenarios.builder.addObjective')}
          disabled={!newObj.text.trim() || (needsValue && !newObj.value.trim())}
          onPress={() => {
            setObjectives([...objectives, builderObjective(newObj.type, newObj.value, newObj.text, Number(newObj.points))])
            setNewObj({ ...newObj, value: '', text: '' })
          }}
        />
      </Card>

      <SectionTitle>{t('scenarios.builder.hints')}</SectionTitle>
      {hints.map((h, i) => (
        <Field key={i} label={`#${i + 1}`} value={h} maxLength={300} onChangeText={(v) => setHints(hints.map((x, j) => (j === i ? v : x)))} />
      ))}
      <Button small title={t('scenarios.builder.addHint')} disabled={hints.length >= 10} onPress={() => setHints([...hints, ''])} />

      <Button variant="primary" title={t('scenarios.builder.save')} disabled={!title.trim()} onPress={() => void save()} style={{ marginTop: 12 }} />
    </Screen>
  )
}
