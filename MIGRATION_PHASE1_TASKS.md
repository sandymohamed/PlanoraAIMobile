# Phase 1 — Task system migration

Migrated from `ManageTimeApp_React-Native` (logic) + Planora UI (visuals).

## Reused from legacy (not rewritten)

| Asset | Path |
|--------|------|
| `taskStore` | `src/store/taskStore.ts` (copied) |
| `taskService` | `src/services/taskService.ts` (adapted to Planora `apiClient`) |
| Task types | `src/types/task.ts` |
| Alarm refresh hook | `src/store/alarmStore.ts` (stub until Phase 4) |

## New / modernized UI

| Screen | Features |
|--------|----------|
| `TasksScreen` | API list, search, status filters, pull-to-refresh, complete/delete, drag reorder (if `react-native-draggable-flatlist` loads), FAB |
| `TaskCreateScreen` | Full form, due date/time, priority, status |
| `TaskEditScreen` | Same form, loads task from store/API |
| `TaskDetailScreen` | View, complete, edit, delete |

Navigation: `TasksStack` inside Tasks tab (`TaskCreate`, `TaskEdit`, `TaskDetail`).

## Backend

Uses `PlanoraBackend` at `src/config/env.ts` → `/api/v1/tasks` (same contract as legacy).

Task due alarms are created by the **backend** when `dueDate`/`dueTime` are set (same as legacy).

## Next phases

- **Phase 2:** Real calendar from legacy `CalendarScreen`
- **Phase 3:** Routines
- **Phase 4:** Full `alarmStore` + `taskAlarmService` + native bridge
- **Phase 5:** AI UX
