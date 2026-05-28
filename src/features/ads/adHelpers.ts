import { isFeatureEnabled } from '@/config/featureFlags';
import { useSubscriptionStore } from '@/store/subscriptionStore';

/** Whether banner placeholders / future banners may render */
export function shouldShowBannerAd(): boolean {
  if (!isFeatureEnabled('ENABLE_ADS') || !isFeatureEnabled('ENABLE_BANNER_ADS')) {
    return false;
  }
  return useSubscriptionStore.getState().shouldShowAds();
}

/** Gate interstitial display (e.g. after N screen views) */
export function shouldShowInterstitial(): boolean {
  if (!isFeatureEnabled('ENABLE_ADS') || !isFeatureEnabled('ENABLE_INTERSTITIAL_ADS')) {
    return false;
  }
  if (!useSubscriptionStore.getState().shouldShowAds()) {
    return false;
  }
  return true;
}

/** Rewarded ads for bonus AI credits etc. */
export function canShowRewardedAd(): boolean {
  if (!isFeatureEnabled('ENABLE_ADS') || !isFeatureEnabled('ENABLE_REWARDED_ADS')) {
    return false;
  }
  return true;
}
