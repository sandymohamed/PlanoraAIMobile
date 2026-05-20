# Planora Mobile

React Native client for **Planora AI** — minimal navigation, premium dark UI.

## Navigation (4 tabs only)

| Tab | Screen |
|-----|--------|
| Home | Premium dashboard — focus, AI, routines, streaks |
| Tasks | Simple task list |
| Calendar | Routines + tasks by day |
| Profile | Settings hub → Goals, Routines, Focus, Premium, Weekly Review |

Stack modals: Subscription, WeeklyReview, Focus, Goals, Routines.

## Design system

- Tokens: `src/theme/tokens.ts` (colors, spacing, typography)
- Paper theme: `src/theme/paperTheme.ts`
- UI: `src/components/ui/` (Card, Button, EmptyState)

Dark-first · purple/teal gradient accent.

## Onboarding

4 slides with product copy — `src/screens/onboarding/OnboardingScreen.tsx`.

## Observability

### Sentry

1. Create project at sentry.io (React Native).
2. Set `SENTRY_DSN` in env / `src/config/env.ts`.
3. `App.tsx` calls `initSentry()` and `wrapApp()`.

### PostHog

1. Set `POSTHOG_API_KEY` and `POSTHOG_HOST`.
2. Use `track()` from `src/analytics/posthog.ts`.

## Native alarms

Reference implementations copied to `src/features/alarms/`:

- `ReliableAlarmService.ts`
- `NativeAlarmBridge.ts`

Copy Android native modules from `ManageTimeApp_React-Native/android` when wiring full alarm reliability.

## Bootstrap note

This package includes `App.tsx` and `src/`. For a runnable build, initialize or copy:

- `android/` and `ios/` from React Native 0.81 template
- `metro.config.js`, `Gemfile` (iOS)

Or symlink from `ManageTimeApp_React-Native` and change `applicationId` / bundle name to Planora.

## Config

`src/config/env.ts` — point `API_BASE_URL` to PlanoraBackend (default `http://localhost:3001/api/v1`).
