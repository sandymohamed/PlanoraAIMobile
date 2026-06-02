/**
 * PostHog (optional). After base install:
 *   npm run install:analytics
 */
import { config } from '@/config/env';

let posthog: { capture?: (e: string, p?: object) => void; identify?: (id: string, t?: object) => void } | null = null;

export async function initPostHog(): Promise<void> {
  if (!config.POSTHOG_API_KEY) return;
  try {
    const PostHog = require('posthog-react-native').default;
    posthog = await PostHog.initAsync(config.POSTHOG_API_KEY, { host: config.POSTHOG_HOST });
  } catch {
    console.warn('[Planora] posthog-react-native not installed — analytics off');
  }
}

export const AnalyticsEvents = {
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SIGNUP_COMPLETED: 'signup_completed',
  GOAL_CREATED: 'goal_created',
  AI_PLAN_GENERATED: 'ai_plan_generated',
  ROUTINE_COMPLETED: 'routine_completed',
  FOCUS_SESSION_STARTED: 'focus_session_started',
  FOCUS_SESSION_ENDED: 'focus_session_ended',
  PREMIUM_UPGRADE_CLICKED: 'premium_upgrade_clicked',
  PAYWALL_VIEWED: 'paywall_viewed',
  PREMIUM_INTEREST: 'premium_interest',
  WAITLIST_JOINED: 'waitlist_joined',
  CONTACT_SUBMITTED: 'contact_submitted',
  WEEKLY_REVIEW_VIEWED: 'weekly_review_viewed',
  WEEKLY_REVIEW_SHARED: 'weekly_review_shared',
} as const;

export function track(event: string, properties?: Record<string, string | number | boolean>): void {
  posthog?.capture?.(event, properties);
}

export function identify(userId: string, traits?: Record<string, string>): void {
  posthog?.identify?.(userId, traits);
}
