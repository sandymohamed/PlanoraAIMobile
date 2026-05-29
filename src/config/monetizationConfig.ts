import { isFeatureEnabled } from '@/config/featureFlags';
import { useSubscriptionStore, PlanType } from '@/store/subscriptionStore';

/** Central monetization config — SDK-ready without RevenueCat/AdMob installed. */
export const MONETIZATION_CONFIG = {
  plans: ['free', 'pro', 'premium'] as const,
  revenueCat: {
    enabled: false,
    apiKeyAndroid: '', // TODO: REVENUECAT_ANDROID_KEY
    apiKeyIos: '',
  },
  admob: {
    enabled: false,
    bannerUnitId: '',
    interstitialUnitId: '',
    rewardedUnitId: '',
  },
  ai: {
    freeDailyPlans: 3,
    proDailyPlans: 15,
    premiumDailyPlans: 50,
  },
} as const;

export function isPremiumUser(): boolean {
  const { planType } = useSubscriptionStore.getState();
  return planType === 'pro' || planType === 'premium';
}

export function shouldShowAds(): boolean {
  if (!isFeatureEnabled('ENABLE_ADS')) return false;
  if (!isFeatureEnabled('ENABLE_BANNER_ADS') && !isFeatureEnabled('ENABLE_REWARDED_ADS')) return false;
  return !isPremiumUser();
}

export function canShowBannerAd(screen: string): boolean {
  if (!shouldShowAds()) return false;
  if (!isFeatureEnabled('ENABLE_BANNER_ADS')) return false;
  const blocked = ['Paywall', 'AlarmCreate', 'AlarmEdit', 'Login', 'Register'];
  return !blocked.includes(screen);
}

export function getPlanCapabilities(plan: PlanType) {
  switch (plan) {
    case 'premium':
      return { ads: false, smartAi: true, advancedAnalytics: true, unlimitedGoals: true };
    case 'pro':
      return { ads: false, smartAi: true, advancedAnalytics: false, unlimitedGoals: true };
    default:
      return { ads: true, smartAi: false, advancedAnalytics: false, unlimitedGoals: false };
  }
}
