import { useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { AttemptResult, MistakeExplanation } from '@aerofms/training'
import { Badge, Button } from '@/components/common/UI'
import { colors, fonts, ui } from '@/theme'
import { useLocalized } from '@/i18n'
import { useTraining } from '@/stores/training'
import { useSettings } from '@/stores/settings'
import { useFms } from '@/stores/fms'

export function ResultSummary({ result, title }: { result: AttemptResult; title: string }) {
  const { t } = useTranslation()
  const items: [string, string][] = [
    [t('training.score'), String(result.score)],
    [t('training.completion'), `${result.completionPct}%`],
    [t('training.correctInputs'), String(result.correctInputs)],
    [t('training.incorrectInputs'), String(result.incorrectInputs)],
    [t('training.hintsUsed'), String(result.hintsUsed)],
    [t('training.time'), `${Math.floor(result.timeSec / 60)}:${String(result.timeSec % 60).padStart(2, '0')}`],
  ]
  return (
    <View style={{ borderWidth: 1, borderColor: colors.success, borderRadius: 8, padding: 12, gap: 8 }}>
      <Text style={[ui.h2, { color: colors.success }]}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {items.map(([k, v]) => (
          <View key={k} style={{ width: '29%' }}>
            <Text style={ui.faint}>{k}</Text>
            <Text style={{ fontFamily: fonts.mono, color: colors.text, fontSize: 18 }}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function MistakeCard({ mistake, answer, onClose }: { mistake: MistakeExplanation; answer?: string; onClose: () => void }) {
  const { t } = useTranslation()
  const L = useLocalized()
  const dispatch = useFms((s) => s.dispatch)
  const [show, setShow] = useState<'why' | 'hint' | 'answer' | null>(null)
  return (
    <View accessibilityLiveRegion="assertive" style={{ borderWidth: 1, borderColor: colors.danger, borderRadius: 8, padding: 12, gap: 6 }}>
      <Text style={ui.label}>{t('mistake.fmcSaid')}</Text>
      <Text style={{ fontFamily: fonts.mono, color: colors.cdu.amber }}>{mistake.fmcMessage}</Text>
      <Text style={ui.h2}>{L(mistake.title)}</Text>
      <Text style={ui.muted}>{L(mistake.body)}</Text>
      {mistake.suggestions.length ? (
        <Text style={ui.body}>
          {t('mistake.suggestions')}: <Text style={{ color: colors.cdu.cyan, fontFamily: fonts.mono }}>{mistake.suggestions.join(', ')}</Text>
        </Text>
      ) : null}
      {show === 'why' ? <Text style={ui.body}>{L(mistake.why)}</Text> : null}
      {show === 'hint' ? <Text style={ui.body}>{L(mistake.hint)}</Text> : null}
      {show === 'answer' && answer ? <Text style={ui.body}>{answer}</Text> : null}
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <Button
          small
          title={t('mistake.reenter')}
          onPress={() => {
            dispatch({ type: 'KEY_LONG', key: 'CLR' })
            onClose()
          }}
        />
        <Button small variant="ghost" title={t('academy.why')} onPress={() => setShow('why')} />
        <Button small variant="ghost" title={t('academy.hint')} onPress={() => setShow('hint')} />
        {answer ? <Button small variant="ghost" title={t('academy.showAnswer')} onPress={() => setShow('answer')} /> : null}
      </View>
    </View>
  )
}

/** Training assistant shown next to / below the emulator. */
export function TrainingOverlay({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation()
  const L = useLocalized()
  const { active, latest, result, requestHint, dismissFeedback, stop } = useTraining()
  useTraining((s) => s.revision)
  const level = useSettings((s) => s.settings.trainingLevel)
  const [hint, setHint] = useState<string | null>(null)
  if (!active) return null
  const exit = () => {
    stop()
    onExit()
  }
  if (active.kind === 'LESSON') {
    const { lesson, runner } = active
    const step = runner.currentStep
    const mistake = latest?.kind === 'MISTAKE' ? latest.mistake : undefined
    return (
      <View style={{ borderWidth: 1, borderColor: colors.accent, borderRadius: 10, padding: 12, gap: 8, backgroundColor: colors.bgElevated }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={[ui.h2, { flex: 1 }]}>{L(lesson.title)}</Text>
          <Badge tone="accent" text={t('academy.step', { current: Math.min(runner.stepIndex + 1, lesson.steps.length), total: lesson.steps.length })} />
        </View>
        {step && !runner.completed ? <Text style={ui.body}>{L(step.instruction)}</Text> : null}
        {step && level === 'BEGINNER' && step.hint && !hint ? <Text style={ui.muted}>{L(step.hint)}</Text> : null}
        {hint ? <Text style={ui.body}>{hint}</Text> : null}
        {latest?.kind === 'WRONG_PAGE' ? <Text style={{ color: colors.warning }}>{L(latest.message)}</Text> : null}
        {mistake ? <MistakeCard mistake={mistake} answer={step ? L(step.hint ?? step.instruction) : undefined} onClose={dismissFeedback} /> : null}
        {runner.completed && result ? <ResultSummary result={result} title={t('academy.lessonComplete')} /> : null}
        <View style={[ui.row, { flexWrap: 'wrap' }]}>
          {!runner.completed ? (
            <Button
              small
              title={t('academy.hint')}
              onPress={() => {
                requestHint()
                const st = runner.currentStep
                setHint(st ? L(st.hint ?? st.instruction) : null)
              }}
            />
          ) : null}
          <Button small variant="ghost" title={t('academy.exit')} onPress={exit} />
        </View>
      </View>
    )
  }
  const { scenario, runner } = active
  const mistake = latest?.kind === 'MISTAKE' ? latest.mistake : undefined
  return (
    <View style={{ borderWidth: 1, borderColor: colors.accent, borderRadius: 10, padding: 12, gap: 8, backgroundColor: colors.bgElevated }}>
      <Text style={ui.h2}>{L(scenario.title)}</Text>
      {scenario.objectives.map((o) => (
        <Text key={o.id} style={{ color: runner.done.has(o.id) ? colors.success : colors.text }}>
          {runner.done.has(o.id) ? '✔' : '○'} {L(o.text)}
        </Text>
      ))}
      {mistake ? <MistakeCard mistake={mistake} onClose={dismissFeedback} /> : null}
      {hint ? <Text style={ui.body}>{hint}</Text> : null}
      {runner.completed && result ? <ResultSummary result={result} title={t('training.result')} /> : null}
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        {!runner.completed && scenario.hints.length ? (
          <Button
            small
            title={t('academy.hint')}
            onPress={() => {
              const idx = requestHint()
              setHint(L(scenario.hints[Math.max(0, idx)]))
            }}
          />
        ) : null}
        <Button small variant="ghost" title={t('academy.exit')} onPress={exit} />
      </View>
    </View>
  )
}
