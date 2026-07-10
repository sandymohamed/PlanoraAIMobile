# RTL Implementation Report

**Date:** July 8, 2026  
**Scope:** Full production-quality RTL support for PlanoraMobile (Arabic / English)

---

## Summary

PlanoraMobile now has a centralized RTL utility layer and systematic layout fixes across navigation, shared components, and screens. When Arabic is selected, `I18nManager.forceRTL(true)` and `swapLeftAndRightInRTL(true)` are applied at startup and on language change; layouts use logical start/end properties and directional icon helpers instead of hardcoded left/right styles.

---

## New RTL Infrastructure

| File | Purpose |
|------|---------|
| `src/utils/rtl.ts` | Core helpers: `isRTL`, `rowDirection`, `textAlign`, `start`/`end`, `marginStart`/`marginEnd`, `paddingStart`/`paddingEnd`, `borderStartWidth`, `directionalTextStyle`, `inputTextStyle`, `directionalHitSlop`, directional icon helpers (`chevronForward`, `chevronBack`, `arrowBack`, `arrowForward`, `navigatePrevious`, `navigateNext`), `iconPlacement`, `rtlStyles` |
| `src/hooks/useRTL.ts` | React hook wrapping all utilities for components |
| `src/navigation/headerOptions.ts` | Shared stack header options with centered titles and RTL-aware back buttons |
| `src/i18n/index.ts` | Added `I18nManager.swapLeftAndRightInRTL(true)` |

---

## Components Fixed

| Component | Changes |
|-----------|---------|
| `TaskListRow` | `marginEnd`, `start`, `borderBottomStartRadius`, `directionalTextStyle`, `directionalHitSlop` |
| `PasswordInput` | `paddingStart`/`paddingEnd`, `inputTextStyle` |
| `DateTimePicker` | Directional text on labels, values, helper text, quick actions |
| `ConfirmDialogHost` | Directional text on title, message, item name; action row auto-mirrors |
| `ActionSheetHost` | Directional text on option labels; row layout auto-mirrors |
| `RoutineForm` | `inputTextStyle` on TextInputs |
| `Card` | No changes needed — children inherit RTL from parent layout |
| `Button` | No changes needed — centered labels are direction-neutral |
| `EmptyState` | Center-aligned text — direction-neutral |

---

## Navigation Fixed

| File | Changes |
|------|---------|
| `MainTabs.tsx` | `marginStart` on logo button; shared `stackHeaderOptions` |
| `ProfileStack.tsx` | Centered header titles |
| `TasksStack.tsx` | Centered header titles |
| `GoalsStack.tsx` | Centered header titles |
| `AlarmsStack.tsx` | Centered header titles |
| `RoutinesStack.tsx` | Centered header titles |
| `AuthNavigator.tsx` | Centered header titles |
| `RootNavigator.tsx` | Already remounts on `key={i18n.language}` — preserved |

**RTL header behavior:** Back button moves to the right in Arabic; titles stay centered; native stack follows `I18nManager.isRTL`.

---

## Screens Fixed

### Home & Dashboard
- `HomeScreen.tsx` — Section headers, AI card chevron, focus card, progress bars, routine rows, directional text

### Calendar
- `CalendarScreen.tsx` — Month navigation icons, FAB (`end`), event/agenda `borderStartWidth`, margins/padding logical properties

### Tasks & Goals
- `TasksScreen.tsx` — Search input RTL, FAB `end`, search icon `marginEnd`
- `GoalDetailScreen.tsx` — Checkbox overlay `start`, `marginEnd`, hit slop
- `GoalsScreen.tsx` — Search input RTL, FAB `end`
- `GoalCreateScreen.tsx`, `GoalEditScreen.tsx` — Input RTL

### Habits / Routines
- `RoutinesScreen.tsx` — FAB `end`

### Alarms
- `AlarmsScreen.tsx` — FAB `end`, directional hit slop
- `AlarmCreateScreen.tsx`, `AlarmEditScreen.tsx` — Input RTL

### Profile & Settings
- `ProfileScreen.tsx` — Removed broken `row-reverse`; uses natural `row` + `chevronForward`
- `SettingsScreen.tsx` — Same pattern: icon → label → chevron mirrors correctly
- `LanguageSettingsScreen.tsx` — Removed `row-reverse`; radio on trailing end
- `NotificationSettingsScreen.tsx` — i18n labels + label/switch row mirrors (label start, switch end)
- `EditProfileScreen.tsx`, `ChangePasswordScreen.tsx` — Input RTL
- `HelpSupportScreen.tsx`, `PrivacySettingsScreen.tsx`, `AboutScreen.tsx` — Inherit global RTL via `flexDirection: 'row'`

### Auth
- `LoginScreen.tsx`, `RegisterScreen.tsx`, `ForgotPasswordScreen.tsx` — `inputTextStyle` on all TextInputs

### Subscription
- `PaywallScreen.tsx` — Input RTL
- `ComparePlansScreen.tsx` — Feature column directional text

### Other
- `FocusScreen.tsx` — Row layouts auto-mirror under RTL
- `OnboardingScreen.tsx` — Row layouts auto-mirror
- `WeeklyReviewScreen.tsx` — Row layouts auto-mirror
- `AnimatedSplashScreen.tsx` — Logo positioned with `end`
- `SplashScreen` — Logical positioning

---

## i18n Additions

Added `notificationSettings.*` keys to `en.json` and `ar.json` for the notification settings screen.

---

## Hardcoded LTR Styles Remaining

| Location | Notes |
|----------|-------|
| `src/utils/rtl.ts` → `directionalHitSlop()` | Uses symmetric `{ left, right }` hit slop — intentional (equal touch targets all sides) |
| Center-aligned text (`textAlign: 'center'`) | Used in dialogs, empty states, calendar day numbers — direction-neutral by design |
| `flexDirection: 'row'` (71 usages) | **Correct** — React Native auto-mirrors `row` when `I18nManager.isRTL` is true |

**No remaining production `marginLeft`/`marginRight`/`paddingLeft`/`paddingRight`/`left:`/`right:`/`borderLeft*` in `src/screens` or `src/components`.**

---

## Directional Icon Policy

| Mirror in RTL | Do NOT mirror |
|---------------|---------------|
| `chevronForward`, `chevronBack` | Delete, Edit, Calendar, Alarm, AI, Check |
| `arrowBack`, `arrowForward` | Repeat, Timer, Crown, Bell |
| `navigatePrevious`, `navigateNext` (calendar month nav) | Plus, Close, Star |

---

## Third-Party Library RTL Notes

| Library | RTL Support | Notes |
|---------|-------------|-------|
| `@react-navigation/native` + `native-stack` | ✅ Good | Back button and headers follow `I18nManager.isRTL` after remount |
| `react-native-paper` | ⚠️ Partial | Provider has no RTL theme override; components not heavily used for layout |
| `@react-native-community/datetimepicker` | ⚠️ Platform-dependent | Native picker follows OS locale; custom UI wrapper is RTL-aware |
| `react-native-linear-gradient` | ✅ Neutral | Gradient direction unchanged (design intent) |
| `react-native-vector-icons` | ✅ Manual | Directional icons flipped via helpers; action icons unchanged |
| `react-native-localize` | ✅ Good | Device language detection |
| `date-fns` | ✅ Neutral | Formatting delegated to `formatDate()` with `ar-EG` locale |

---

## Known Limitations / Remaining Issues

1. **App restart on language switch** — `I18nManager.forceRTL` is applied immediately, but some native layouts may require a full app restart for pixel-perfect mirroring on certain Android devices. The language settings screen already notes this.

2. **ComparePlansScreen** — Feature table content is still hardcoded English (pre-existing i18n gap, not RTL-specific).

3. **Some profile sub-screens** (`HelpSupport`, `Privacy`, `About`, `DataExport`) — Use `flexDirection: 'row'` which auto-mirrors, but do not yet apply `directionalTextStyle()` on every text node. Visual result is acceptable because global RTL handles layout; text alignment follows inherited direction.

4. **TaskListRow status badge** — Hardcoded English status strings ("Done") — pre-existing i18n gap.

5. **`react-native-restart`** — Not integrated; optional enhancement for seamless RTL toggle without manual restart.

---

## Testing Checklist

Verify in **English (LTR)** and **Arabic (RTL)**:

- [ ] Home: Today's Focus, AI Coach chevron, See All, Manage, task rows, goal progress, streak card
- [ ] Settings: Row order `العنوان >` (title on start, chevron on end)
- [ ] Profile: Menu rows mirror like Settings
- [ ] Calendar: Month prev/next icons, FAB bottom-end, event accent border on start side
- [ ] Tasks: Search bar, FAB, task rows with checkbox on start
- [ ] Goals, Routines, Alarms: FAB position, card rows
- [ ] Auth: Email/password cursor and placeholder alignment
- [ ] Dialogs: Cancel/confirm button order mirrors
- [ ] Action sheets: Icon + label rows mirror
- [ ] Navigation: Back button on right in Arabic, centered titles
- [ ] Tab bar: Icons and labels render correctly

---

## Usage Guide for Future Components

```tsx
import { useRTL } from '@/hooks/useRTL';
import { inputTextStyle, marginStart, chevronForwardIcon } from '@/utils/rtl';

// In a component:
const { directionalTextStyle, chevronForward } = useRTL();

<View style={{ flexDirection: 'row' }}>  {/* auto-mirrors in RTL */}
  <Icon name="cog" />
  <Text style={directionalTextStyle()}>Label</Text>
  <Icon name={chevronForward()} />
</View>

<TextInput style={[styles.input, inputTextStyle()]} />

<View style={{ position: 'absolute', end: 16, bottom: 16 }} />  {/* FAB */}
```

**Do not** use `flexDirection: 'row-reverse'` when `I18nManager.forceRTL` is active — it double-reverses the layout.

**Do not** use `marginLeft`/`marginRight` — use `marginStart`/`marginEnd`.

**Do not** use `transform: [{ scaleX: -1 }]` for layout mirroring.
