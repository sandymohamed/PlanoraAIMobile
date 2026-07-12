import i18n from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { identify, refreshGlobalProperties } from '@/analytics/posthog';
import { getAppVersion } from '@/analytics/analyticsHelpers';

/** Identify the signed-in user with safe, non-PII traits only. */
export function identifyCurrentUser(): void {
  const user = useAuthStore.getState().user;
  if (!user?.id) return;

  const { isPremium } = useSubscriptionStore.getState();
  const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const plan = isPremium ? 'premium' : 'free';

  identify(user.id, {
    plan,
    language,
    appVersion: getAppVersion(),
  });

  void refreshGlobalProperties(plan);
}
