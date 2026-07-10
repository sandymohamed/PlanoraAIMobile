# PlanoraMobile i18n Implementation Report

## Implemented

- Added production i18n stack:
  - `i18next`
  - `react-i18next`
  - `react-native-localize`
- Added scalable locale structure:
  - `src/i18n/index.ts`
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ar.json`
- Added automatic first-launch language detection:
  - Arabic device language selects Arabic.
  - All other device languages fall back to English.
- Added persisted language selection with `AsyncStorage`.
- Added runtime language switching through the Settings/Profile stack.
- Added RTL direction control through `I18nManager`.
- Added locale-aware `formatDate()` and `formatNumber()` helpers.
- Migrated these high-impact surfaces:
  - App startup i18n initialization.
  - Main tab labels and accessibility labels.
  - Root/auth/profile/tasks/goals/routines/alarms navigation titles.
  - Profile screen.
  - Settings screen.
  - New Language settings screen.
  - Authentication screens.
  - Shared confirmation dialog defaults.
  - Shared action sheet cancel/dismiss labels.
  - Calendar screen.
  - Home screen.
  - Shared `DateTimePicker` component.

## Remaining Hardcoded Strings

The following files still contain user-facing strings and should be migrated in the next passes:

- `src/screens/tasks/TasksScreen.tsx`
- `src/screens/tasks/TaskCreateScreen.tsx`
- `src/screens/tasks/TaskEditScreen.tsx`
- `src/screens/tasks/TaskDetailScreen.tsx`
- `src/components/tasks/TaskForm.tsx`
- `src/components/tasks/TaskListRow.tsx`
- `src/screens/goals/GoalsScreen.tsx`
- `src/screens/goals/GoalCreateScreen.tsx`
- `src/screens/goals/GoalEditScreen.tsx`
- `src/screens/goals/GoalDetailScreen.tsx`
- `src/screens/alarms/AlarmsScreen.tsx`
- `src/screens/alarms/AlarmCreateScreen.tsx`
- `src/screens/alarms/AlarmEditScreen.tsx`
- `src/screens/routines/RoutinesScreen.tsx`
- `src/components/routines/RoutineForm.tsx`
- `src/screens/focus/FocusScreen.tsx`
- `src/screens/onboarding/OnboardingScreen.tsx`
- `src/screens/splash/AnimatedSplashScreen.tsx`
- `src/screens/profile/EditProfileScreen.tsx`
- `src/screens/profile/ChangePasswordScreen.tsx`
- `src/screens/profile/NotificationSettingsScreen.tsx`
- `src/screens/profile/PrivacySettingsScreen.tsx`
- `src/screens/profile/DataExportScreen.tsx`
- `src/screens/profile/HelpSupportScreen.tsx`
- `src/screens/profile/AboutScreen.tsx`
- `src/screens/subscription/SubscriptionScreen.tsx`
- `src/screens/subscription/PaywallScreen.tsx`
- `src/screens/subscription/ComparePlansScreen.tsx`
- `src/screens/reviews/WeeklyReviewScreen.tsx`
- Premium/paywall helper components.
- Some utility-generated messages in task/goal/alarm UI helpers.

## Screens Not Yet Fully Migrated

- Tasks
- Goals
- AI Planning / Goal AI plan generation surfaces
- Alarms
- Routines
- Focus Timer
- Notifications settings
- Profile subpages
- Premium / Paywall / Compare Plans
- Onboarding
- Splash / offline / recovery pages
- Weekly Review

## Missing Translations

- No missing keys were found for the translated surfaces added in this pass.
- English and Arabic locale files currently have matching groups for the implemented surfaces.
- Future migration should add feature-specific namespaces:
  - `tasks`
  - `goals`
  - `alarms`
  - `routines`
  - `focus`
  - `premium`
  - `onboarding`
  - `notifications`
  - `validation`

## RTL Issues Found

- Settings and Profile rows were updated with RTL row direction and flipped chevrons.
- Language selection supports RTL text alignment.
- Full app-wide RTL visual verification is still needed for:
  - Task and goal forms.
  - Alarm time-first screens.
  - Routine frequency/day chips.
  - Focus timer controls.
  - Bottom tabs and stack back buttons on physical devices.
- `I18nManager.forceRTL()` is applied immediately on language change, but some native layout direction changes in React Native may only fully settle after the app is reopened. The UI language changes immediately.

## Recommended Improvements

- Continue migration feature-by-feature instead of doing a risky one-shot replacement.
- Add an i18n CI check that fails on user-facing string literals in `Text`, `Button`, placeholders, dialogs, and accessibility labels.
- Add a locale parity script to ensure every key in `en.json` exists in `ar.json`.
- Add pseudo-locale testing later to catch truncation and layout overflow.
- Add screenshot QA for Arabic on common device sizes.
