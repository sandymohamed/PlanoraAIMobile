/**
 * PostHog (optional). After base install:
 *   npm run install:analytics
 */
import { config } from '@/config/env';
import {
  AnalyticsProperties,
  AnalyticsPropertyValue,
  buildGlobalProperties,
  extractFailureProps,
  maskProjectKey,
  sanitizeProperties,
} from '@/analytics/analyticsHelpers';

/** Set DEBUG_ANALYTICS=true in .env to print PostHog debug logs. */
export const DEBUG_ANALYTICS = config.DEBUG_ANALYTICS;

type PostHogClient = {
  capture?: (event: string, properties?: object) => void;
  identify?: (userId: string, traits?: object) => void;
  register?: (properties: object) => void;
};

let posthog: PostHogClient | null = null;
let initAttempted = false;

function debugLog(message: string, payload?: unknown): void {
  if (!DEBUG_ANALYTICS) return;
  if (payload !== undefined) {
    console.log(message, payload);
  } else {
    console.log(message);
  }
}

function debugWarn(message: string, error?: unknown): void {
  if (!DEBUG_ANALYTICS) return;
  if (error !== undefined) {
    console.warn(message, error);
  } else {
    console.warn(message);
  }
}

function logConnected(): void {
  if (!DEBUG_ANALYTICS || !config.POSTHOG_API_KEY) return;
  console.log('✅ PostHog connected successfully');
  console.log('Host:');
  console.log(config.POSTHOG_HOST);
  console.log('Project:');
  console.log(maskProjectKey(config.POSTHOG_API_KEY));
}

export async function initPostHog(): Promise<void> {
  if (initAttempted) return;
  initAttempted = true;

  if (!config.POSTHOG_API_KEY) {
    debugWarn('[PostHog] Initialization skipped — POSTHOG_API_KEY is not set');
    return;
  }

  try {
    const PostHog = require('posthog-react-native').default;
    posthog = await PostHog.initAsync(config.POSTHOG_API_KEY, { host: config.POSTHOG_HOST });
    debugLog('[PostHog] Initialized');
    await refreshGlobalProperties();
    logConnected();
  } catch (error) {
    posthog = null;
    debugWarn('[PostHog] Initialization failed', error);
  }
}

export async function refreshGlobalProperties(plan: 'free' | 'premium' = 'free'): Promise<void> {
  if (!posthog?.register) return;
  try {
    posthog.register(buildGlobalProperties(plan));
  } catch (error) {
    debugWarn('[PostHog] Register global properties failed', error);
  }
}

export const AnalyticsEvents = {
  // Onboarding & legacy
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SIGNUP_COMPLETED: 'signup_completed',
  CONTACT_SUBMITTED: 'contact_submitted',

  // Auth
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  SESSION_EXPIRED: 'session_expired',
  REFRESH_TOKEN_FAILED: 'refresh_token_failed',
  SIGNUP_FAILED: 'signup_failed',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_RESET_FAILED: 'password_reset_failed',

  // Tasks
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_UNCOMPLETED: 'task_uncompleted',
  TASK_DELETED: 'task_deleted',
  TASK_CREATION_FAILED: 'task_creation_failed',
  TASK_UPDATE_FAILED: 'task_update_failed',
  TASK_DELETE_FAILED: 'task_delete_failed',

  // Goals
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  GOAL_COMPLETED: 'goal_completed',
  GOAL_DELETED: 'goal_deleted',
  GOAL_CREATION_FAILED: 'goal_creation_failed',
  GOAL_UPDATE_FAILED: 'goal_update_failed',
  GOAL_DELETE_FAILED: 'goal_delete_failed',

  // Habits (formerly routines)
  HABIT_CREATED: 'habit_created',
  HABIT_UPDATED: 'habit_updated',
  HABIT_COMPLETED: 'habit_completed',
  HABIT_SKIPPED: 'habit_skipped',
  HABIT_DELETED: 'habit_deleted',
  HABIT_CREATION_FAILED: 'habit_creation_failed',
  HABIT_UPDATE_FAILED: 'habit_update_failed',
  HABIT_DELETE_FAILED: 'habit_delete_failed',

  // Alarms
  ALARM_CREATED: 'alarm_created',
  ALARM_UPDATED: 'alarm_updated',
  ALARM_DELETED: 'alarm_deleted',
  ALARM_TRIGGERED: 'alarm_triggered',
  ALARM_DISMISSED: 'alarm_dismissed',
  ALARM_SNOOZED: 'alarm_snoozed',
  ALARM_CREATION_FAILED: 'alarm_creation_failed',

  // Calendar
  CALENDAR_OPENED: 'calendar_opened',
  CALENDAR_EVENT_CREATED: 'calendar_event_created',
  CALENDAR_EVENT_UPDATED: 'calendar_event_updated',
  CALENDAR_EVENT_DELETED: 'calendar_event_deleted',

  // Navigation / screens
  HOME_OPENED: 'home_opened',
  TASKS_OPENED: 'tasks_opened',
  GOALS_OPENED: 'goals_opened',
  HABITS_OPENED: 'habits_opened',
  ALARMS_OPENED: 'alarms_opened',
  PROFILE_OPENED: 'profile_opened',
  SETTINGS_OPENED: 'settings_opened',
  WEEKLY_REVIEW_OPENED: 'weekly_review_opened',

  // Language
  LANGUAGE_CHANGED: 'language_changed',

  // Premium
  PREMIUM_PAGE_OPENED: 'premium_page_opened',
  PREMIUM_COMPARE_PLANS: 'premium_compare_plans',
  PREMIUM_UPGRADE_CLICKED: 'premium_upgrade_clicked',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  PURCHASE_RESTORED: 'purchase_restored',
  PAYWALL_VIEWED: 'paywall_viewed',
  PREMIUM_INTEREST: 'premium_interest',
  WAITLIST_JOINED: 'waitlist_joined',

  // AI funnel
  AI_PLANNER_OPENED: 'ai_planner_opened',
  AI_GENERATE_CLICKED: 'ai_generate_clicked',
  AI_REQUEST_STARTED: 'ai_request_started',
  AI_PLAN_GENERATED: 'ai_plan_generated',
  AI_PLAN_FAILED: 'ai_plan_failed',
  PLAN_SAVED: 'plan_saved',
  TASKS_GENERATED: 'tasks_generated',
  OFFLINE_TEMPLATE_USED: 'offline_template_used',

  // Focus & reviews
  FOCUS_SESSION_STARTED: 'focus_session_started',
  FOCUS_SESSION_ENDED: 'focus_session_ended',
  WEEKLY_REVIEW_VIEWED: 'weekly_review_viewed',
  WEEKLY_REVIEW_SHARED: 'weekly_review_shared',

  // Legacy aliases (kept for existing dashboards)
  ROUTINE_COMPLETED: 'routine_completed',
} as const;

export function track(
  event: string,
  properties?: Record<string, AnalyticsPropertyValue | undefined>
): void {
  const payload = sanitizeProperties(properties);
  if (!posthog?.capture) return;

  try {
    posthog.capture(event, payload);
    if (DEBUG_ANALYTICS) {
      console.log('--------------------------------');
      console.log('[PostHog] Event');
      console.log(event);
      console.log('properties:');
      console.log(payload);
    }
  } catch (error) {
    debugWarn('[PostHog] Capture failed', error);
  }
}

export function trackFailure(
  event: string,
  error: unknown,
  extra?: Record<string, AnalyticsPropertyValue | undefined>
): void {
  track(event, { ...extractFailureProps(error), ...extra });
}

export function identify(
  userId: string,
  traits?: Record<string, AnalyticsPropertyValue | undefined>
): void {
  const payload = sanitizeProperties(traits);
  if (!posthog?.identify) return;

  try {
    posthog.identify(userId, payload);
    if (DEBUG_ANALYTICS) {
      console.log('--------------------------------');
      console.log('[PostHog] Identify');
      console.log('userId:');
      console.log(userId);
      if (Object.keys(payload).length > 0) {
        for (const [key, value] of Object.entries(payload)) {
          console.log(`${key}:`);
          console.log(value);
        }
      }
    }
  } catch (error) {
    debugWarn('[PostHog] Identify failed', error);
  }
}
