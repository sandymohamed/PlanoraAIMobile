import { isFeatureEnabled } from '@/config/featureFlags';
import { getDailyAILimit, getPlanFeatures } from '@/config/aiLimits';
import { useSubscriptionStore, PlanType } from '@/store/subscriptionStore';

export type PremiumGateResult =
  | { allowed: true }
  | { allowed: false; message: string; action?: 'upgrade' | 'watch_ad' };

export function requirePremium(featureLabel = 'This feature'): PremiumGateResult {
  if (!isFeatureEnabled('ENABLE_PREMIUM')) {
    return { allowed: true };
  }
  const { planType } = useSubscriptionStore.getState();
  if (planType !== 'free') {
    return { allowed: true };
  }
  return {
    allowed: false,
    message: `${featureLabel} is available on Pro and Premium plans.`,
    action: 'upgrade',
  };
}

export function requireAIQuota(): PremiumGateResult {
  if (!isFeatureEnabled('ENABLE_AI_PREMIUM')) {
    return { allowed: true };
  }
  const store = useSubscriptionStore.getState();
  if (store.canUsePremiumAI()) {
    return { allowed: true };
  }
  const limit = getDailyAILimit(store.planType);
  return {
    allowed: false,
    message: `You've used your ${limit} AI plans for today. Upgrade or watch a short ad for more.`,
    action: 'upgrade',
  };
}

export function canAccessFeature(feature: keyof ReturnType<typeof getPlanFeatures>): boolean {
  const { planType } = useSubscriptionStore.getState();
  const features = getPlanFeatures(planType);
  return Boolean(features[feature]);
}

export function canGenerateAIPlan(): PremiumGateResult {
  const quota = requireAIQuota();
  if (!quota.allowed) return quota;

  if (isFeatureEnabled('ENABLE_SMART_AI')) {
    const { planType } = useSubscriptionStore.getState();
    if (planType === 'free' && !isFeatureEnabled('ENABLE_AI_PREMIUM')) {
      return { allowed: true };
    }
  }

  return { allowed: true };
}

export function getPlanDisplayName(plan: PlanType): string {
  switch (plan) {
    case 'pro':
      return 'Pro';
    case 'premium':
      return 'Premium';
    default:
      return 'Free';
  }
}
