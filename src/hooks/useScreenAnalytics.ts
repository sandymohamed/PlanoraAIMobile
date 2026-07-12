import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { track } from '@/analytics/posthog';
import type { AnalyticsPropertyValue } from '@/analytics/analyticsHelpers';

/**
 * Fire a screen analytics event once each time the screen gains focus.
 * Does not re-fire on in-screen rerenders.
 */
export function useScreenAnalytics(
  event: string,
  properties?: Record<string, AnalyticsPropertyValue | undefined>
): void {
  useFocusEffect(
    useCallback(() => {
      track(event, properties);
    }, [event])
  );
}
