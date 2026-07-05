# PlanoraMobile Performance Audit

## Scope

This audit focused on making the React Native app feel faster without changing features. The inspected areas were navigation, rendering, Zustand subscriptions, API/data loading, startup work, lists, images/assets, native screens, heavy components, bundle size, memory, animations, and production logs.

## Optimizations Applied

### Navigation And Startup

Why it was slow:

The app rendered nothing while auth initialization was running, then showed the splash after auth completed. That serialized the splash and startup work, creating a blank startup window. Main tabs also mounted eagerly, causing Calendar, Tasks, Profile, and Home work to start together.

Before:

```tsx
if (!isInitialized) return null;

if (showSplash) {
  return <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />;
}
```

After:

```tsx
if (!isInitialized || showSplash) {
  return <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />;
}
```

Before:

```tsx
<Tab.Navigator screenOptions={({ navigation }) => ({ ... })}>
```

After:

```tsx
<Tab.Navigator
  detachInactiveScreens
  screenOptions={({ navigation }) => ({
    lazy: true,
    freezeOnBlur: true,
    ...
  })}
>
```

Estimated improvement:

Startup feels faster because the user sees the splash immediately instead of a blank screen. First authenticated render should be noticeably lighter because inactive tabs no longer mount and fetch immediately.

### Native Screens

Why it was slow:

The project used React Navigation native stacks but did not explicitly enable native screen optimizations at bootstrap.

Before:

```js
import { AppRegistry } from 'react-native';
```

After:

```js
import 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';

enableScreens(true);
enableFreeze(true);
```

Estimated improvement:

Lower memory and less rendering work for hidden screens, especially during tab and stack navigation.

### Deferred Startup Services

Why it was slow:

Alarm recovery, alarm cleanup, PostHog initialization, push notifications, and offline queue processing were imported or started during the initial app path.

Before:

```tsx
initSentry();
initPostHog();
clearAllAlarmTimerState().catch(() => {});
alarmFixService.initialize().catch(() => {});
initializeAuth().then(() => processOfflineQueue()).catch(() => {});
```

After:

```tsx
initSentry();
const startupTask = InteractionManager.runAfterInteractions(() => {
  initPostHog();
  import('@/utils/alarmCleanup').then(({ clearAllAlarmTimerState }) => clearAllAlarmTimerState());
  import('@/services/AlarmFixService').then(({ alarmFixService }) => alarmFixService.initialize());
});

initializeAuth()
  .then(() => import('@/services/offlineQueue'))
  .then(({ processOfflineQueue }) => processOfflineQueue());
```

Estimated improvement:

Lower initial JS parse and less native work before first interaction. This should improve cold-start responsiveness on mid-range Android devices.

### Zustand Subscriptions

Why it was slow:

Several components subscribed to entire Zustand stores. Any unrelated state update could re-render those screens or hosts.

Before:

```tsx
const { filteredTasks, isLoading, error, searchQuery, fetchTasks } = useTaskStore();
```

After:

```tsx
const filteredTasks = useTaskStore((s) => s.filteredTasks);
const isLoading = useTaskStore((s) => s.isLoading);
const error = useTaskStore((s) => s.error);
const searchQuery = useTaskStore((s) => s.searchQuery);
const fetchTasks = useTaskStore((s) => s.fetchTasks);
```

Applied to:

- `src/navigation/RootNavigator.tsx`
- `src/screens/tasks/TasksScreen.tsx`
- `src/screens/home/HomeScreen.tsx`
- `src/hooks/useCalendarData.ts`
- `src/components/ConfirmDialogHost.tsx`
- `src/components/ActionSheetHost.tsx`

Estimated improvement:

Large reduction in avoidable rerenders during task, goal, alarm, auth, and dialog state updates.

### Task List Rendering

Why it was slow:

`TaskListRow` is animation-heavy and was recreated when parents re-rendered. `TasksScreen` also passed new callback/header/refresh references to `FlatList`.

Before:

```tsx
export const TaskListRow: React.FC<Props> = ({ task, ... }) => { ... };

const renderTask = ({ item: task }) => (
  <TaskListRow
    task={task}
    onPress={() => handleOpen(task)}
    onToggleComplete={async () => toggleTaskComplete(task)}
  />
);
```

After:

```tsx
const TaskListRowComponent: React.FC<Props> = ({ task, ... }) => { ... };

export const TaskListRow = React.memo(TaskListRowComponent, (prev, next) => (
  prev.task.id === next.task.id &&
  prev.task.title === next.task.title &&
  prev.task.status === next.task.status &&
  prev.task.priority === next.task.priority &&
  prev.task.dueDate === next.task.dueDate &&
  prev.task.dueTime === next.task.dueTime
));
```

```tsx
const renderTask = useCallback(({ item: task }) => (
  <TaskListRow ... />
), [handleDelete, handleOpen, toggleTaskComplete]);

<FlatList
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={Platform.OS === 'android'}
/>
```

Estimated improvement:

Smoother task scrolling and less JS work while typing in search, switching filters, refreshing, or updating unrelated task state.

### Calendar Rendering

Why it was slow:

Calendar day view rebuilt 24 hour slots and repeatedly filtered day tasks/reminders during render.

Before:

```tsx
const slots = HOUR_SLOTS.map((hour) => ({
  tasks: cal.dayTasks.filter((t) => cal.getTaskHour(t) === hour),
  reminders: cal.dayReminders.filter((r) => r.date.getHours() === hour),
}));
```

After:

```tsx
const dayTimelineSlots = useMemo(() => (
  HOUR_SLOTS.map((hour) => ({
    tasks: cal.dayTasks.filter((t) => cal.getTaskHour(t) === hour),
    reminders: cal.dayReminders.filter((r) => r.date.getHours() === hour),
  }))
), [cal.dayTasks, cal.dayReminders, cal.getTaskHour]);
```

Calendar refresh also now runs routine reminders in the same `Promise.all` batch as tasks/goals/alarms/routines.

Estimated improvement:

Less repeated work in the heaviest screen, especially when switching to day view or refreshing calendar data.

### Production Logs

Why it was slow/risky:

Some auth and alarm logs ran in production and included sensitive or high-volume details. Console logging on device can hurt performance and leak operational details.

Before:

```ts
console.log('[Planora Auth] login', email);
console.log(`Scheduling alarm: ${alarm.title}`);
console.error('Failed to cancel native alarm:', error);
```

After:

```ts
logger.info('[Planora Auth] login');
logger.info(`Scheduling alarm: ${alarm.title}`);
logger.error('Failed to cancel native alarm', error);
```

The shared logger returns immediately in production:

```ts
if (!__DEV__) return;
```

Estimated improvement:

Lower production JS overhead, less noisy device logging, and less risk of leaking emails, user IDs, alarm titles, backend details, or debug internals.

## High Priority Remaining

- Run `npx prisma migrate deploy` for backend reset-token issue separately; the mobile app can appear slow or broken when backend endpoints hang/fail.
- Add in-flight deduplication and short TTL caching to `alarmStore.fetchAlarms`. It is called from multiple paths and performs expensive native cancel/schedule work.
- Change alarm rescheduling to diff-based scheduling so unchanged alarms are not canceled and scheduled again on every fetch.
- Convert `AlarmsScreen` from `ScrollView` plus nested maps to `SectionList` if alarm counts can grow.
- Profile release APK startup on a real device with Flipper/Systrace or React Native DevTools because dev mode performance is not representative.

## Medium Priority Remaining

- Lazy-load infrequently used root modals/stacks such as subscription, paywall, compare plans, weekly review, focus, goals, routines, and alarms.
- Extract and memoize `GoalListCard`, `AlarmRow`, and heavy goal detail milestone rows.
- Replace width-based `TaskListRow` progress animation with transform-based animation where possible so more animation work can stay on the native driver.
- Compress `src/assets/logo.jpg` and re-encode `src/assets/logo.mp4`; consider WebP/static splash if video cost is high.
- Lazy-load `xlsx` only when the user starts data export.

## Low Priority Remaining

- Remove unused dependencies after verification: `react-native-draggable-flatlist` appears unused, and `react-native-reanimated` has no app imports.
- Remove unused Android icon fonts if only MaterialCommunityIcons are used.
- Add `getItemLayout` where row heights become fixed.
- Consider reducing the auth startup health ping or making it non-blocking if the API is reliable.

## Verification

Checks run:

```bash
npm run lint
npx tsc --noEmit
```

Results:

- `npm run lint` could not run because `eslint` is not installed in `PlanoraMobile`.
- `npx tsc --noEmit` still fails on existing errors outside the optimization batch:
  - `src/store/goalStore.ts`: `pagination` possibly undefined.
  - `src/utils/calendarEngine.ts`: `recurrenceRule` type mismatch on `Task` / `TaskMetadata`.

The TypeScript errors that appeared in the touched `apiClient.ts` were fixed.

## Expected Overall Improvement

Expected perceived improvement: medium to high.

The biggest user-visible gains should come from:

- No blank screen before splash during auth initialization.
- Lazy/frozen tabs avoiding immediate Calendar/Profile/Tasks work.
- Fewer rerenders from Zustand selector fixes.
- Smoother task list rendering from row memoization and FlatList tuning.
- Less production logging overhead.

Further improvement depends mostly on optimizing `alarmStore.fetchAlarms`, asset size, and lazy-loading rarely used screens.
