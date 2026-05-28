/**
 * Planora feature flags — environment-aware toggles for gradual rollout.
 * No SDK required; flip flags when integrating AdMob / RevenueCat.
 */

export type FeatureFlag =
  | 'ENABLE_ADS'
  | 'ENABLE_PREMIUM'
  | 'ENABLE_AI_PREMIUM'
  | 'ENABLE_ADVANCED_ANALYTICS'
  | 'ENABLE_COLLABORATION'
  | 'ENABLE_SMART_AI'
  | 'ENABLE_REWARDED_ADS'
  | 'ENABLE_BANNER_ADS'
  | 'ENABLE_INTERSTITIAL_ADS';

type FlagMap = Record<FeatureFlag, boolean>;

const DEVELOPMENT_FLAGS: FlagMap = {
  ENABLE_ADS: true,
  ENABLE_PREMIUM: true,
  ENABLE_AI_PREMIUM: true,
  ENABLE_ADVANCED_ANALYTICS: false,
  ENABLE_COLLABORATION: false,
  ENABLE_SMART_AI: true,
  ENABLE_REWARDED_ADS: true,
  ENABLE_BANNER_ADS: true,
  ENABLE_INTERSTITIAL_ADS: false,
};

const PRODUCTION_FLAGS: FlagMap = {
  ENABLE_ADS: true,
  ENABLE_PREMIUM: true,
  ENABLE_AI_PREMIUM: true,
  ENABLE_ADVANCED_ANALYTICS: false,
  ENABLE_COLLABORATION: false,
  ENABLE_SMART_AI: false,
  ENABLE_REWARDED_ADS: true,
  ENABLE_BANNER_ADS: true,
  ENABLE_INTERSTITIAL_ADS: true,
};

function activeFlags(): FlagMap {
  return __DEV__ ? DEVELOPMENT_FLAGS : PRODUCTION_FLAGS;
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return activeFlags()[flag] ?? false;
}

export function getAllFeatureFlags(): FlagMap {
  return { ...activeFlags() };
}
