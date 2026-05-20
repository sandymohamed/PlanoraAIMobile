import { create } from 'zustand';
import { apiClient } from '@/services/apiClient';
import { track, AnalyticsEvents } from '@/analytics/posthog';

interface SubscriptionState {
  tier: 'FREE' | 'PREMIUM';
  isPremium: boolean;
  limits: { maxActiveGoals: number; maxAiPerMonth: number };
  fetch: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  tier: 'FREE',
  isPremium: false,
  limits: { maxActiveGoals: 3, maxAiPerMonth: 5 },

  fetch: async () => {
    const res = await apiClient.get<any>('/subscription');
    const d = res.data;
    set({
      tier: d.tier,
      isPremium: d.isPremium,
      limits: d.limits,
    });
  },
}));

export function trackPremiumClick(source: string) {
  track(AnalyticsEvents.PREMIUM_UPGRADE_CLICKED, { source });
}
