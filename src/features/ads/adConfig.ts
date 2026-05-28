/**
 * Ad unit ID placeholders — replace with real AdMob IDs at launch.
 * @see TODO_LAUNCH_ADS.md
 */

export const AD_CONFIG = {
  /** Google test app ID (Android) */
  testAppId: 'ca-app-pub-3940256099942544~3347511713',

  banner: {
    production: 'ca-app-pub-XXXXXXXX/BBBBBBBBBB',
    test: 'ca-app-pub-3940256099942544/6300978111',
  },
  rewarded: {
    production: 'ca-app-pub-XXXXXXXX/RRRRRRRRRR',
    test: 'ca-app-pub-3940256099942544/5224354917',
  },
  interstitial: {
    production: 'ca-app-pub-XXXXXXXX/IIIIIIIIII',
    test: 'ca-app-pub-3940256099942544/1033173712',
  },
} as const;

export function getBannerAdUnitId(): string {
  return __DEV__ ? AD_CONFIG.banner.test : AD_CONFIG.banner.production;
}

export function getRewardedAdUnitId(): string {
  return __DEV__ ? AD_CONFIG.rewarded.test : AD_CONFIG.rewarded.production;
}

export function getInterstitialAdUnitId(): string {
  return __DEV__ ? AD_CONFIG.interstitial.test : AD_CONFIG.interstitial.production;
}
