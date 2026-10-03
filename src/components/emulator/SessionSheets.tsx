import { useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { formatRelative } from '@aerofms/i18n'
import type { AircraftDefinition, SessionExport, SessionSummary } from '@aerofms/core'
import { Button, Field, Segmented, Sheet, toast } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { services } from '@/services/runtime'
import { useFms } from '@/stores/fms'
import { currentLanguage } from '@/i18n'

export async function shareJson(data: unknown, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename)
  file.write(JSON.stringify(data, null, 2))
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json' })
}

export async function pickJsonText(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true })
  if (r.canceled || !r.assets[0]) return null
  const f = new File(r.assets[0].uri)
  if ((f.size ?? 0) > 5 * 1024 * 1024) return null
  return f.text()
}

/** Manufacturer → aircraft → system picker. */
export function AircraftPicker({ initial, onPick }: { initial?: string; onPick: (id: string) => void }) {
  const { t } = useTranslation()
  const all = services().registry.list()
  const init = all.find((a) => a.id === initial) ?? all[0]
  const [mfr, setMfr] = useState<AircraftDefinition['manufacturer']>(init?.manufacturer ?? 'BOEING')
  const list = all.filter((a) => a.manufacturer === mfr)
  return (
    <View style={{ gap: 12 }}>
      <Segmented
        label={t('aircraft.manufacturer')}
        value={mfr}
        onChange={setMfr}
        options={[
          { value: 'BOEING', label: 'Boeing' },
          { value: 'AIRBUS', label: 'Airbus' },
        ]}
      />
      {list.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          onPress={() => onPick(a.id)}
          style={({ pressed }) => [{ minHeight: 56, borderRadius: 8, borderWidth: 1, borderColor: a.id === initial ? colors.accent : colors.border, padding: 12, backgroundColor: pressed ? colors.surfaceRaised : colors.surface }]}
        >
          <Text style={ui.body}>{a.displayName}</Text>
          <Text style={ui.faint}>
            {a.fmsType} · {a.engine}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function SwitchAircraftSheet({ target, onClose }: { target: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const state = useFms((s) => s.state)
  const switchAircraft = useFms((s) => s.switchAircraft)
  if (!target || !state) return null
  const from = services().registry.definition(state.aircraft.aircraftId)
  const to = services().registry.definition(target)
  const go = (mode: 'save' | 'discard') => {
    onClose()
    void switchAircraft(target, mode)
  }
  return (
    <Sheet
      visible
      title={t('aircraft.switchTitle')}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" title={t('common.cancel')} onPress={onClose} />
          <Button title={t('aircraft.switchWithoutSaving')} onPress={() => go('discard')} />
          <Button variant="primary" title={t('aircraft.saveAndSwitch')} onPress={() => go('save')} />
        </>
      }
    >
      <Text style={ui.body}>{t('aircraft.switchQuestion', { from: from?.model ?? '', system: from?.manufacturer === 'AIRBUS' ? 'MCDU' : 'FMC', to: to?.model ?? '' })}</Text>
    </Sheet>
  )
}

export function SessionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const fms = useFms()
  const state = fms.state
  const [list, setList] = useState<SessionSummary[]>([])
  const [airport, setAirport] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const aircraftId = state?.aircraft.aircraftId
  const refresh = () => void (aircraftId ? services().sessions.list(aircraftId).then(setList) : undefined)
  useEffect(refresh, [visible, aircraftId, state?.session.updatedAt])
  if (!state || !aircraftId) return null
  const confirm = (msg: string, fn: () => void) => Alert.alert(t('common.confirm'), msg, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.confirm'), style: 'destructive', onPress: fn }])
  return (
    <Sheet visible={visible} title={t('session.title')} onClose={onClose}>
      <Field label={t('session.newAtAirport')} placeholder={t('session.airportPlaceholder')} value={airport} maxLength={4} autoCapitalize="characters" onChangeText={(v) => setAirport(v.toUpperCase())} />
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        <Button
          small
          variant="primary"
          title={t('session.newAtAirport')}
          disabled={!services().nav.searchAirport(airport)}
          onPress={async () => {
            await fms.newSession(aircraftId, { airport })
            onClose()
          }}
        />
        <Button
          small
          title={t('session.newEmpty')}
          onPress={async () => {
            await fms.newSession(aircraftId)
            onClose()
          }}
        />
        <Button
          small
          title={t('session.import')}
          onPress={async () => {
            const text = await pickJsonText()
            if (!text) return
            try {
              const id = await services().sessions.import(JSON.parse(text) as SessionExport)
              await fms.openSession(id)
              onClose()
            } catch {
              toast(t('session.importError'), 'error')
            }
          }}
        />
      </View>
      {list.length === 0 ? <Text style={ui.muted}>{t('session.empty')}</Text> : null}
      {list.map((s) => {
        const current = s.id === state.session.sessionId
        return (
          <View key={s.id} style={{ borderWidth: 1, borderColor: current ? colors.accent : colors.border, borderRadius: 8, padding: 10, gap: 6 }}>
            <Text style={ui.body}>{s.name}</Text>
            <Text style={ui.faint}>
              {s.origin ?? '----'} → {s.destination ?? '----'} · {formatRelative(currentLanguage(), s.updatedAt)} · {t('session.actions', { count: s.actionCount })}
            </Text>
            <View style={[ui.row, { flexWrap: 'wrap' }]}>
              {!current ? (
                <Button
                  small
                  variant="primary"
                  title={t('session.continue')}
                  onPress={async () => {
                    const r = await fms.openSession(s.id)
                    if (r === 'corrupted') toast(t('session.corrupted'), 'error')
                    else onClose()
                  }}
                />
              ) : null}
              <Button small variant="ghost" title={t('common.rename')} onPress={() => setRenaming({ id: s.id, name: s.name })} />
              <Button small variant="ghost" title={t('common.duplicate')} onPress={() => void services().sessions.duplicate(s.id).then(refresh)} />
              <Button
                small
                variant="ghost"
                title={t('common.export')}
                onPress={async () => {
                  const data = await services().sessions.export(s.id)
                  if (data) await shareJson(data, `${s.name.replace(/[^\w-]+/g, '_')}.aerofms-session.json`)
                }}
              />
              {current ? <Button small variant="ghost" title={t('common.reset')} onPress={() => confirm(t('session.resetConfirm'), () => void fms.resetSession())} /> : null}
              <Button small variant="ghost" title={t('common.delete')} onPress={() => confirm(t('session.deleteConfirm'), () => void fms.deleteSession(s.id).then(refresh))} />
            </View>
          </View>
        )
      })}
      <Sheet
        visible={!!renaming}
        title={t('session.rename')}
        onClose={() => setRenaming(null)}
        footer={
          <Button
            variant="primary"
            title={t('common.save')}
            onPress={async () => {
              if (!renaming) return
              await services().sessions.rename(renaming.id, renaming.name)
              if (renaming.id === state.session.sessionId) await fms.reload()
              setRenaming(null)
              refresh()
            }}
          />
        }
      >
        <Field label={t('session.renamePrompt')} value={renaming?.name ?? ''} maxLength={60} onChangeText={(v) => renaming && setRenaming({ ...renaming, name: v })} />
      </Sheet>
    </Sheet>
  )
}
