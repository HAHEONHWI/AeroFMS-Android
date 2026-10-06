import { useQuery } from '@tanstack/react-query'
import { router, Stack } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { formatRelative } from '@aerofms/i18n'
import { deleteCloudReplay, isSessionExportPayload, listCloudReplays, loadCloudReplay } from '@aerofms/cloud'
import type { SessionExport } from '@aerofms/core'
import { Button, Card, Screen, SectionTitle, toast } from '@/components/common/UI'
import { ui } from '@/theme'
import { services } from '@/services/runtime'
import { currentLanguage } from '@/i18n'
import { getFirebase } from '@/platform/firebase'
import { useAuth } from '@/stores/auth'

export default function ReplayList() {
  const { t } = useTranslation()
  const q = useQuery({ queryKey: ['sessions', 'replay'], queryFn: () => services().sessions.list() })
  const list = (q.data ?? []).filter((s) => s.actionCount > 0)
  return (
    <Screen edges={['left', 'right']}>
      <Stack.Screen options={{ title: t('replay.title') }} />
      <Text style={ui.muted}>{t('replay.subtitle')}</Text>
      {list.length === 0 ? <Text style={ui.muted}>{t('replay.empty')}</Text> : null}
      {list.map((s) => (
        <Pressable key={s.id} accessibilityRole="button" onPress={() => router.push(`/replay/${encodeURIComponent(s.id)}`)} style={ui.card}>
          <Text style={ui.h2}>{s.name}</Text>
          <Text style={ui.faint}>
            {services().registry.definition(s.aircraftId)?.displayName} · {s.origin ?? '----'} → {s.destination ?? '----'} · {t('session.actions', { count: s.actionCount })} · {formatRelative(currentLanguage(), s.updatedAt)}
          </Text>
        </Pressable>
      ))}
      <CloudReplays />
    </Screen>
  )
}

/** Replays uploaded from any device; importing one creates a local session to play back. */
function CloudReplays() {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const fb = getFirebase()
  const q = useQuery({ queryKey: ['cloudReplays', user?.uid], queryFn: () => (fb && user ? listCloudReplays(fb.db, user.uid) : Promise.resolve([])), enabled: !!fb && !!user })
  if (!fb || !user) return null
  const open = async (id: string) => {
    try {
      const payload = await loadCloudReplay(fb.db, user.uid, id)
      if (!isSessionExportPayload(payload)) throw new Error(t('replay.invalid'))
      const sessionId = await services().sessions.import(payload as unknown as SessionExport)
      toast(t('replay.imported'), 'success')
      router.push(`/replay/${encodeURIComponent(sessionId)}`)
    } catch (e) {
      toast(e instanceof Error && e.message !== 'INVALID_SESSION_FILE' ? e.message : t('replay.invalid'), 'error')
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <SectionTitle>{t('replay.cloudTitle')}</SectionTitle>
      {q.data?.length === 0 ? <Text style={ui.muted}>{t('replay.cloudEmpty')}</Text> : null}
      {(q.data ?? []).map((r) => (
        <Card key={r.id}>
          <Text style={ui.h2}>{r.title}</Text>
          <Text style={ui.faint}>
            {services().registry.definition(r.aircraftId)?.displayName} · {t('session.actions', { count: r.actionCount })} · {formatRelative(currentLanguage(), r.createdAt)}
          </Text>
          <View style={ui.row}>
            <Button small variant="primary" title={t('replay.import')} onPress={() => void open(r.id)} />
            <Button
              small
              variant="ghost"
              title={t('common.delete')}
              onPress={async () => {
                await deleteCloudReplay(fb.db, user.uid, r.id)
                void q.refetch()
              }}
            />
          </View>
        </Card>
      ))}
    </View>
  )
}
