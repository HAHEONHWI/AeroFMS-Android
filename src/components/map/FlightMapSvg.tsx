import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, Text, View } from 'react-native'
import type { PanResponderInstance } from 'react-native'
import Svg, { Circle, G, Path, Polygon, Text as SvgText } from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import { buildMapScene, computeVnavProfile, displayedPerformance, displayedPlan } from '@aerofms/core'
import type { AircraftFmsAdapter, FmsState, MapLine } from '@aerofms/core'
import type { NavigationProvider } from '@aerofms/navigation'
import { colors, fonts } from '@/theme'

type Ring = number[][]
interface LandFeature {
  bbox: [number, number, number, number]
  rings: Ring[]
}

let landCache: LandFeature[] | undefined

/** Natural Earth 1:50m land (public domain), bundled for offline rendering. */
function land(): LandFeature[] {
  if (landCache) return landCache
  const gj = require('../../../assets/geo/land.json') as { features: { geometry: { type: string; coordinates: unknown } }[] }
  const out: LandFeature[] = []
  for (const f of gj.features) {
    const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][]
    for (const poly of polys) {
      const outer = poly[0]
      if (!outer) continue
      let minX = 180
      let minY = 90
      let maxX = -180
      let maxY = -90
      for (const [x = 0, y = 0] of outer) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
      out.push({ bbox: [minX, minY, maxX, maxY], rings: poly })
    }
  }
  landCache = out
  return out
}

interface View2D {
  lon: number
  lat: number
  /** pixels per degree latitude */
  k: number
}

const m = colors.map
const LINE_STYLE: Partial<Record<MapLine['kind'], { color: string; width: number; dash?: string }>> = {
  AIRWAY: { color: m.airway, width: 1 },
  RUNWAY: { color: m.runway, width: 3 },
  FIX_RING: { color: m.fix, width: 1, dash: '4,4' },
  FIX_RADIAL: { color: m.fix, width: 1, dash: '4,4' },
  SECONDARY: { color: m.secondary, width: 1.5, dash: '4,4' },
  MISSED: { color: m.missed, width: 1.5, dash: '5,4' },
  ACTIVE: { color: m.active, width: 2.5 },
  MOD: { color: m.mod, width: 2, dash: '5,4' },
  HOLD: { color: m.hold, width: 1.5 },
}
const ORDER: MapLine['kind'][] = ['AIRWAY', 'RUNWAY', 'FIX_RING', 'FIX_RADIAL', 'SECONDARY', 'MISSED', 'ACTIVE', 'MOD', 'HOLD']

export interface FlightMapProps {
  state: FmsState
  nav: NavigationProvider
  adapter: AircraftFmsAdapter
  width: number
  height: number
  showAirways?: boolean
  onSelectLeg?: (legId: string) => void
}

export function FlightMapSvg({ state, nav, adapter, width, height, showAirways = true, onSelectLeg }: FlightMapProps) {
  const { t } = useTranslation()
  const scene = useMemo(() => {
    const plan = displayedPlan(state)
    const vnav = computeVnavProfile(plan, displayedPerformance(state), adapter.performanceModel, nav)
    return buildMapScene(state, nav, { showAirways, vnav })
  }, [state, nav, adapter, showAirways])
  const [baseView, setView] = useState<View2D>({ lon: 127.5, lat: 36.5, k: 80 })
  const [follow, setFollowState] = useState(false)
  const acPos = state.position.aircraft
  // While following, the aircraft position overrides the centre (derived, not synced through an effect).
  const view = follow && acPos ? { ...baseView, lon: acPos.lon, lat: acPos.lat } : baseView
  const setFollow = (on: boolean) => {
    if (!on) setView(view)
    setFollowState(on)
  }
  const fitted = useRef('')

  const fit = () => {
    const b = scene.bounds
    if (!b) return
    const cos = Math.cos((((b[1] + b[3]) / 2) * Math.PI) / 180)
    const spanX = Math.max(0.3, (b[2] - b[0]) * cos)
    const spanY = Math.max(0.3, b[3] - b[1])
    setView({ lon: (b[0] + b[2]) / 2, lat: (b[1] + b[3]) / 2, k: Math.min(2000, Math.min((width - 60) / spanX, (height - 60) / spanY)) })
  }
  const key = `${state.session.sessionId}:${displayedPlan(state).origin}:${displayedPlan(state).destination}`
  useEffect(() => {
    if (fitted.current !== key && scene.bounds) {
      fitted.current = key
      fit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scene.bounds])

  const cos = Math.cos((view.lat * Math.PI) / 180)
  const px = (lon: number) => (lon - view.lon) * view.k * cos + width / 2
  const py = (lat: number) => (view.lat - lat) * view.k + height / 2

  // Pan & pinch.
  const [panZoom] = useState(() => createPanZoomResponder(baseView, setView, () => setFollowState(false)))
  useEffect(() => {
    panZoom.sync(view)
  })

  // Land paths for the visible region.
  const landPaths = useMemo(() => {
    const halfW = width / 2 / (view.k * cos)
    const halfH = height / 2 / view.k
    const vb = [view.lon - halfW, view.lat - halfH, view.lon + halfW, view.lat + halfH]
    const out: string[] = []
    const minPx = 1.5
    for (const f of land()) {
      if (f.bbox[2] < (vb[0] ?? 0) || f.bbox[0] > (vb[2] ?? 0) || f.bbox[3] < (vb[1] ?? 0) || f.bbox[1] > (vb[3] ?? 0)) continue
      let d = ''
      for (const ring of f.rings) {
        let lastX = Infinity
        let lastY = Infinity
        let first = true
        for (const [lon = 0, lat = 0] of ring) {
          const x = px(lon)
          const y = py(lat)
          if (!first && Math.abs(x - lastX) < minPx && Math.abs(y - lastY) < minPx) continue
          d += `${first ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
          first = false
          lastX = x
          lastY = y
        }
        d += 'Z'
      }
      out.push(d)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, width, height])

  const linePath = (coords: [number, number][]) => coords.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join('')
  const ac = scene.points.find((p) => p.kind === 'AIRCRAFT')

  return (
    <View style={{ width, height, backgroundColor: m.background, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }} accessibilityLabel={t('map.title')}>
      <View style={{ flex: 1 }} {...panZoom.responder.panHandlers}>
        <Svg width={width} height={height}>
          {landPaths.map((d, i) => (
            <Path key={i} d={d} fill={m.land} stroke="#24344b" strokeWidth={0.6} />
          ))}
          {ORDER.flatMap((kind) =>
            scene.lines
              .filter((l) => l.kind === kind)
              .map((l) => {
                const st = LINE_STYLE[kind]
                return st ? <Path key={l.id} d={linePath(l.coordinates)} stroke={st.color} strokeWidth={st.width} strokeDasharray={st.dash} fill="none" /> : null
              }),
          )}
          {scene.points
            .filter((p) => p.kind !== 'AIRCRAFT')
            .map((p) => {
              const x = px(p.coordinate[0])
              const y = py(p.coordinate[1])
              if (x < -40 || y < -40 || x > width + 40 || y > height + 40) return null
              const color =
                p.kind === 'AIRPORT' ? m.airport : p.kind === 'DISCONTINUITY' ? colors.warning : p.kind === 'TOC' || p.kind === 'TOD' || p.kind === 'STEP' ? m.tocTod : p.kind === 'FIX_REF' ? m.fix : p.active ? m.active : m.waypoint
              return (
                <G key={p.id} onPress={p.legId && onSelectLeg ? () => onSelectLeg(p.legId ?? '') : undefined}>
                  {p.highlighted ? <Circle cx={x} cy={y} r={11} stroke={m.highlight} strokeWidth={2} fill="none" /> : null}
                  <Circle cx={x} cy={y} r={p.kind === 'AIRPORT' ? 6 : p.kind === 'DISCONTINUITY' ? 8 : 4} stroke={color} strokeWidth={1.6} fill={p.kind === 'TOC' || p.kind === 'TOD' ? color : m.background} />
                  {p.label ? (
                    <SvgText x={x + 8} y={y + 4} fill={color} fontSize={11} fontFamily={fonts.mono}>
                      {p.constraint ? `${p.label} ${p.constraint}` : p.label}
                    </SvgText>
                  ) : null}
                </G>
              )
            })}
          {ac ? (
            <G x={px(ac.coordinate[0])} y={py(ac.coordinate[1])} rotation={ac.headingTrue ?? 0} origin="0,0">
              <Polygon points="0,-11 8,9 0,4 -8,9" fill={m.aircraft} stroke="#05080D" strokeWidth={1.2} />
            </G>
          ) : null}
        </Svg>
      </View>
      <View style={{ position: 'absolute', top: 8, left: 8, gap: 6 }}>
        <MapButton label={t('map.fit')} onPress={fit} />
        {ac ? <MapButton label={t('map.follow')} active={follow} onPress={() => setFollow(!follow)} /> : null}
      </View>
      <View style={{ position: 'absolute', top: 8, right: 8, gap: 6 }}>
        <MapButton label="+" onPress={() => setView((v) => ({ ...v, k: Math.min(4000, v.k * 1.5) }))} />
        <MapButton label="−" onPress={() => setView((v) => ({ ...v, k: Math.max(4, v.k / 1.5) }))} />
      </View>
      {scene.points.length === 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted }}>{t('map.noRoute')}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** Pan with one finger, pinch-zoom with two. The latest rendered view is pushed in via sync() after each commit. */
function createPanZoomResponder(initial: View2D, setView: (v: View2D) => void, stopFollow: () => void): { responder: PanResponderInstance; sync(v: View2D): void } {
  const viewRef = { current: initial }
  const gesture = { startView: initial, startDist: 0, lastTouches: 0 }
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      gesture.startView = viewRef.current
      gesture.startDist = 0
      gesture.lastTouches = 0
      stopFollow()
    },
    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches
      const sv = gesture.startView
      if (touches.length >= 2) {
        const [a, b] = touches
        if (!a || !b) return
        const d = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY)
        if (gesture.lastTouches < 2 || gesture.startDist === 0) {
          gesture.startDist = d
          gesture.startView = viewRef.current
        } else {
          const k = Math.max(4, Math.min(4000, gesture.startView.k * (d / gesture.startDist)))
          setView({ ...gesture.startView, k })
        }
      } else if (gesture.lastTouches <= 1) {
        const c = Math.cos((sv.lat * Math.PI) / 180)
        setView({ ...sv, lon: sv.lon - g.dx / (sv.k * c), lat: sv.lat + g.dy / sv.k })
      }
      gesture.lastTouches = touches.length
    },
  })
  return {
    responder,
    sync: (v) => {
      viewRef.current = v
    },
  }
}

function MapButton({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minWidth: 40, height: 36, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: active ? colors.accent : colors.border, backgroundColor: 'rgba(17,24,36,0.92)', alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: active ? colors.accent : colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  )
}
