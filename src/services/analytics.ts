import { Analytics } from '@aerofms/cloud'
import type { AnalyticsEvent, AnalyticsParams } from '@aerofms/cloud'
import { createNativeAnalyticsSink } from '@/platform/native'

export const analytics = new Analytics([createNativeAnalyticsSink()])

export function track(event: AnalyticsEvent, params?: AnalyticsParams): void {
  analytics.track(event, params)
}
