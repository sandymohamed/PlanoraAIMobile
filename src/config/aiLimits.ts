import type { PlanType } from '@/store/subscriptionStore';

export interface PlanFeatureSet {
  aiPlansPerDay: number;
  aiTokensBudget: number;
  smartSuggestions: boolean;
  advancedAnalytics: boolean;
  collaboration: boolean;
  adsRemoved: boolean;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatureSet> = {
  free: {
    aiPlansPerDay: 3,
    aiTokensBudget: 2000,
    smartSuggestions: false,
    advancedAnalytics: false,
    collaboration: false,
    adsRemoved: false,
  },
  pro: {
    aiPlansPerDay: 15,
    aiTokensBudget: 12000,
    smartSuggestions: true,
    advancedAnalytics: true,
    collaboration: false,
    adsRemoved: true,
  },
  premium: {
    aiPlansPerDay: 999,
    aiTokensBudget: 50000,
    smartSuggestions: true,
    advancedAnalytics: true,
    collaboration: true,
    adsRemoved: true,
  },
};

export function getPlanFeatures(plan: PlanType): PlanFeatureSet {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}

export function getDailyAILimit(plan: PlanType): number {
  return getPlanFeatures(plan).aiPlansPerDay;
}

export function getAITokensBudget(plan: PlanType): number {
  return getPlanFeatures(plan).aiTokensBudget;
}
