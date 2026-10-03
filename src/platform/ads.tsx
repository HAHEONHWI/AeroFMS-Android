import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { create } from 'zustand'
import { decideAd, DEFAULT_MONETIZATION_CONFIG, DisabledAdService } from '@aerofms/shared'
import type { AdConsentStatus, AdFreeContext, AdPlacement, AdRuntimeState, AdService, MonetizationConfig } from '@aerofms/shared'
import { ADMOB_UNITS, ADS_NATIVE } from './native'

/**
 * Monetization runtime. The Google Mobile Ads SDK is only linked when the build opts in
 * (AEROFMS_ENABLE_ADS=true); ads are also switched off by default via Remote Config.
 * Placements are never shown on the emulator, during training, replay, onboarding or legal pages.
 */
interface AdsStore {
  config: MonetizationConfig
  runtime: AdRuntimeState
  setConfig(c: MonetizationConfig): void
  setContext(c: AdFreeContext | undefined): void
}

export const useAds = create<AdsStore>((set, get) => ({
  config: DEFAULT_MONETIZATION_CONFIG,
  runtime: { consent: 'UNKNOWN', interstitialsThisSession: 0 },
  setConfig: (config) => set({ config }),
  setContext: (activeContext) => set({ runtime: { ...get().runtime, activeContext } }),
}))

type GmaModule = typeof import('react-native-google-mobile-ads')

function gma(): GmaModule | null {
  if (!ADS_NATIVE) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module is only linked in some builds
    return require('react-native-google-mobile-ads') as GmaModule
  } catch {
    return null
  }
}

class AdMobAdService implements AdService {
  readonly provider = 'admob' as const
  constructor(private readonly m: GmaModule) {}

  async initialize(): Promise<void> {
    await this.m.default().initialize()
  }

  async requestConsent(): Promise<AdConsentStatus> {
    try {
      const info = await this.m.AdsConsent.gatherConsent()
      const status: AdConsentStatus = info.canRequestAds ? 'OBTAINED' : 'REQUIRED'
      useAds.setState({ runtime: { ...useAds.getState().runtime, consent: status } })
      return status
    } catch {
      return 'UNKNOWN'
    }
  }

  private allowed(p: AdPlacement): boolean {
    const { config, runtime } = useAds.getState()
    return decideAd(p, config, runtime, Date.now()).show
  }

  showInterstitial(p: AdPlacement): Promise<boolean> {
    if (!this.allowed(p)) return Promise.resolve(false)
    const unit = ADMOB_UNITS.interstitialUnitId ?? this.m.TestIds.INTERSTITIAL
    const ad = this.m.InterstitialAd.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true })
    return new Promise((resolve) => {
      const offLoaded = ad.addAdEventListener(this.m.AdEventType.LOADED, () => {
        void ad.show()
        const rt = useAds.getState().runtime
        useAds.setState({ runtime: { ...rt, lastInterstitialAt: Date.now(), interstitialsThisSession: rt.interstitialsThisSession + 1 } })
        resolve(true)
      })
      const offError = ad.addAdEventListener(this.m.AdEventType.ERROR, () => resolve(false))
      ad.load()
      setTimeout(() => {
        offLoaded()
        offError()
        resolve(false)
      }, 8000)
    })
  }

  showRewarded(p: AdPlacement): Promise<boolean> {
    if (!this.allowed(p)) return Promise.resolve(false)
    const unit = ADMOB_UNITS.rewardedUnitId ?? this.m.TestIds.REWARDED
    const ad = this.m.RewardedAd.createForAdRequest(unit, { requestNonPersonalizedAdsOnly: true })
    return new Promise((resolve) => {
      ad.addAdEventListener(this.m.RewardedAdEventType.LOADED, () => void ad.show())
      ad.addAdEventListener(this.m.RewardedAdEventType.EARNED_REWARD, () => resolve(true))
      ad.addAdEventListener(this.m.AdEventType.CLOSED, () => resolve(false))
      ad.addAdEventListener(this.m.AdEventType.ERROR, () => resolve(false))
      ad.load()
    })
  }
}

let service: AdService | undefined

export function adService(): AdService {
  if (service) return service
  const m = gma()
  service = m ? new AdMobAdService(m) : new DisabledAdService()
  return service
}

/** Marks the current screen as ad-free while mounted. */
export function useAdFreeContext(context: AdFreeContext): void {
  useEffect(() => {
    useAds.getState().setContext(context)
    return () => useAds.getState().setContext(undefined)
  }, [context])
}

/** Banner slot: renders nothing unless ads are enabled, consented and allowed for this placement. */
export function AdBanner({ placement }: { placement: AdPlacement }) {
  const { config, runtime } = useAds()
  const [failed, setFailed] = useState(false)
  // Banner eligibility does not depend on the interstitial cooldown, so the mount time is sufficient.
  const [mountedAt] = useState(() => Date.now())
  const m = gma()
  if (!m || failed || !decideAd(placement, config, runtime, mountedAt).show) return null
  const { BannerAd, BannerAdSize } = m
  return (
    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
      <BannerAd
        unitId={ADMOB_UNITS.bannerUnitId ?? m.TestIds.ADAPTIVE_BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  )
}
