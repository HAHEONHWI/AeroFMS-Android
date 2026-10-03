import { useState } from 'react'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Network from 'expo-network'
import { create } from 'zustand'
import { CONNECTOR_DEFAULT_PORT, ConnectorClient, probeConnectors, subnetHosts } from '@aerofms/simulation'
import type { ConnectorInfo, ConnectorStatus } from '@aerofms/simulation'
import { Button, Field } from '@/components/common/UI'
import { colors, ui } from '@/theme'
import { useSettings } from '@/stores/settings'
import { useFms } from '@/stores/fms'
import { track } from '@/services/analytics'

interface ConnectorStore {
  client?: ConnectorClient
  status: ConnectorStatus
  info?: ConnectorInfo
  message?: string
}

export const useConnector = create<ConnectorStore>(() => ({ status: 'DISCONNECTED' }))

function client(): ConnectorClient {
  const existing = useConnector.getState().client
  if (existing) return existing
  const c = new ConnectorClient((url) => new WebSocket(url) as never, 'android')
  let last = 0
  c.on('status', (status, message) => {
    useConnector.setState({ status, message })
    if (status === 'CONNECTED') track('simulator_connected', { simulator: useConnector.getState().info?.simulators[0]?.kind ?? 'unknown' })
  })
  c.on('info', (info) => useConnector.setState({ info }))
  c.on('aircraft', (aircraft) => {
    const now = Date.now()
    if (now - last < 1000) return
    last = now
    useFms.getState().dispatch({ type: 'EXTERNAL_STATE', aircraft })
  })
  useConnector.setState({ client: c })
  return c
}

/** Local Network Mode: discover AeroFMS Connector on the same Wi-Fi and connect over WebSocket. */
export function ConnectorPanel() {
  const { t } = useTranslation()
  const host = useSettings((s) => s.settings.connectorHost)
  const update = useSettings((s) => s.update)
  const { status, info, message } = useConnector()
  const plan = useFms((s) => s.state?.activeFlightPlan)
  const [draft, setDraft] = useState(host)
  const [searching, setSearching] = useState(false)
  const [found, setFound] = useState<{ host: string; info: ConnectorInfo }[] | null>(null)
  const connected = status === 'CONNECTED' || status === 'WAITING_FOR_SIM'
  const search = async () => {
    setSearching(true)
    setFound(null)
    try {
      const ip = await Network.getIpAddressAsync()
      const hosts = subnetHosts(ip, CONNECTOR_DEFAULT_PORT)
      const results: { host: string; info: ConnectorInfo }[] = []
      for (let i = 0; i < hosts.length; i += 32) {
        results.push(...(await probeConnectors(hosts.slice(i, i + 32), (url, init) => fetch(url, init), 700)))
      }
      setFound(results)
    } finally {
      setSearching(false)
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={ui.h2}>{t('connector.title')}</Text>
      <Text style={ui.muted}>{t('connector.description')}</Text>
      <Button title={searching ? t('connector.searching') : t('connector.search')} disabled={searching} onPress={() => void search()} />
      {found && found.length === 0 ? <Text style={ui.faint}>{t('connector.noneFound')}</Text> : null}
      {found?.map((f) => (
        <View key={f.host} style={[ui.row, { justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.body}>{f.info.hostName}</Text>
            <Text style={ui.faint}>{f.host}</Text>
          </View>
          <Button
            small
            variant="primary"
            title={t('connector.connect')}
            onPress={() => {
              setDraft(f.host)
              update({ connectorHost: f.host })
              client().connect(f.host)
            }}
          />
        </View>
      ))}
      <Field label={t('connector.host')} placeholder={t('connector.hostPlaceholder')} value={draft} autoCapitalize="none" onChangeText={(v) => setDraft(v.trim())} />
      {status === 'DISCONNECTED' || status === 'ERROR' ? (
        <Button
          variant="primary"
          title={t('connector.connect')}
          disabled={!/^[\w.-]+:\d{2,5}$/.test(draft)}
          onPress={() => {
            update({ connectorHost: draft })
            client().connect(draft)
          }}
        />
      ) : (
        <Button title={t('connector.disconnect')} onPress={() => useConnector.getState().client?.disconnect()} />
      )}
      <Text style={{ color: status === 'CONNECTED' ? colors.success : status === 'ERROR' ? colors.danger : colors.textMuted }}>
        {t(`connector.status.${status}`)}
        {message ? ` – ${message}` : ''}
      </Text>
      {info?.simulators.map((s) => (
        <Text key={s.id} style={ui.faint}>
          {t('connector.simulator')}: {s.name} {s.available ? '✓' : '—'}
        </Text>
      ))}
      {connected && plan ? <Button small title={t('connector.sendRoute')} onPress={() => useConnector.getState().client?.sendFlightPlan(plan)} /> : null}
    </View>
  )
}
