import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/services/apiClient';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { getDailyAILimit, getPlanFeatures } from '@/config/aiLimits';
import { isFeatureEnabled } from '@/config/featureFlags';

export type PlanType = 'free' | 'pro' | 'premium';

/** @deprecated Use planType — kept for existing SubscriptionScreen / API */
export type LegacyTier = 'FREE' | 'PREMIUM';

interface SubscriptionState {
  planType: PlanType;
  isPremium: boolean;
  aiCreditsRemaining: number;
  adsRemoved: boolean;
  loading: boolean;
  expiresAt: string | null;

  /** Monthly AI plan usage from backend (null limit/remaining = unlimited / premium) */
  aiPlansUsed: number;
  aiPlansLimit: number | null;
  aiPlansRemaining: number | null;

  /** Legacy fields — synced from planType */
  tier: LegacyTier;
  limits: { maxActiveGoals: number; maxAiPerMonth: number };

  setPlan: (plan: PlanType, expiresAt?: string | null) => void;
  consumeAICredit: () => boolean;
  restoreSubscription: () => Promise<void>;
  resetSubscription: () => void;
  canUsePremiumAI: () => boolean;
  shouldShowAds: () => boolean;

  /** Optional backend sync when routes are ready */
  fetch: () => Promise<void>;

  /** Fetch monthly AI plan usage (GET /ai/usage) */
  fetchAIUsage: () => Promise<void>;
}

interface AIUsagePayload {
  isPremium: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}

function planToLegacy(plan: PlanType): { tier: LegacyTier; isPremium: boolean; adsRemoved: boolean } {
  if (plan === 'free') {
    return { tier: 'FREE', isPremium: false, adsRemoved: false };
  }
  return { tier: 'PREMIUM', isPremium: true, adsRemoved: true };
}

function applyPlan(set: (p: Partial<SubscriptionState>) => void, plan: PlanType, expiresAt?: string | null) {
  const legacy = planToLegacy(plan);
  const features = getPlanFeatures(plan);
  set({
    planType: plan,
    isPremium: legacy.isPremium,
    adsRemoved: features.adsRemoved,
    aiCreditsRemaining: getDailyAILimit(plan),
    expiresAt: expiresAt ?? null,
    tier: legacy.tier,
    limits: {
      maxActiveGoals: plan === 'free' ? 3 : 999,
      maxAiPerMonth: plan === 'free' ? 5 : plan === 'pro' ? 30 : 999,
    },
  });
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      planType: 'free',
      isPremium: false,
      aiCreditsRemaining: getDailyAILimit('free'),
      adsRemoved: false,
      loading: false,
      expiresAt: null,
      aiPlansUsed: 0,
      aiPlansLimit: 3,
      aiPlansRemaining: 3,
      tier: 'FREE',
      limits: { maxActiveGoals: 3, maxAiPerMonth: 3 },

      setPlan: (plan, expiresAt) => {
        applyPlan(set, plan, expiresAt);
      },

      consumeAICredit: () => {
        const { aiCreditsRemaining, planType } = get();
        if (planType === 'premium') return true;
        if (aiCreditsRemaining <= 0) return false;
        set({ aiCreditsRemaining: aiCreditsRemaining - 1 });
        return true;
      },

      restoreSubscription: async () => {
        set({ loading: true });
        try {
          // Future: RevenueCat.restorePurchases()
          await get().fetch();
        } finally {
          set({ loading: false });
        }
      },

      resetSubscription: () => {
        applyPlan(set, 'free', null);
      },

      canUsePremiumAI: () => {
        if (!isFeatureEnabled('ENABLE_AI_PREMIUM')) return true;
        const { planType, aiCreditsRemaining } = get();
        if (planType === 'premium') return true;
        return aiCreditsRemaining > 0;
      },

      shouldShowAds: () => {
        if (!isFeatureEnabled('ENABLE_ADS')) return false;
        return !get().adsRemoved;
      },

      fetch: async () => {
        try {
          const res = await apiClient.get<{
            success: boolean;
            data: {
              tier: LegacyTier;
              isPremium: boolean;
              limits: { maxActiveGoals: number; maxAiPerMonth: number };
              aiUsage?: AIUsagePayload;
            };
          }>('/subscription');
          const d = res.data;
          const plan: PlanType = d.isPremium || d.tier === 'PREMIUM' ? 'premium' : 'free';
          applyPlan(set, plan);
          if (d.aiUsage) {
            set({
              aiPlansUsed: d.aiUsage.used,
              aiPlansLimit: d.aiUsage.limit,
              aiPlansRemaining: d.aiUsage.remaining,
            });
          }
        } catch {
          /* keep local persisted plan */
        }
      },

      fetchAIUsage: async () => {
        try {
          const res = await apiClient.get<{ success: boolean; data: AIUsagePayload }>('/ai/usage');
          const u = res.data;
          set({
            aiPlansUsed: u.used,
            aiPlansLimit: u.limit,
            aiPlansRemaining: u.remaining,
            isPremium: u.isPremium || get().isPremium,
          });
        } catch {
          /* keep local persisted usage */
        }
      },
    }),
    {
      name: 'planora-subscription',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        planType: s.planType,
        aiCreditsRemaining: s.aiCreditsRemaining,
        expiresAt: s.expiresAt,
        aiPlansUsed: s.aiPlansUsed,
        aiPlansLimit: s.aiPlansLimit,
        aiPlansRemaining: s.aiPlansRemaining,
      }),
    }
  )
);

export function trackPremiumClick(source: string) {
  track(AnalyticsEvents.PREMIUM_UPGRADE_CLICKED, { source });
}
