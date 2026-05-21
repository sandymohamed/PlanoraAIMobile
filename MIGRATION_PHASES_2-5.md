# PlanoraMobile — Phases 2–5 migration summary

Logic migrated from `ManageTimeApp_React-Native`; UI uses Planora tokens.

## Phase 2 — Calendar
- `src/hooks/useCalendarData.ts` — tasks + routine instances + reminders (legacy calendar logic)
- `src/screens/calendar/CalendarScreen.tsx` — month / week / day views, task modal, API refresh

## Phase 3 — Routines
- `src/services/routineService.ts` (legacy)
- `src/screens/routines/*` + `src/components/routines/RoutineForm.tsx`
- CRUD, toggle sub-tasks, reset, delete, alarm refresh after create

## Phase 4 — Alarms & timers
- `src/store/alarmStore.ts` (full legacy store)
- `src/services/alarmApiService.ts`, `ReliableAlarmService.ts`, `NativeAlarmBridge.ts`
- `src/screens/alarms/*`, `src/navigation/AlarmsStack.tsx`
- `src/screens/focus/FocusScreen.tsx` — backend timer create/start/pause/stop
- `notificationService` stub (native alarms primary on Android)

## Phase 5 — AI UX
- `src/services/aiService.ts` — `/ai/generate-simple-plan`, `/ai/generate-plan`
- `src/services/goalService.ts` — real goals list/create
- `src/screens/goals/GoalsScreen.tsx` — AI plan generation + goal list
- `src/screens/reviews/WeeklyReviewScreen.tsx` — `/reviews/current` (existing)
- Home dashboard loads real tasks, routines, goals

## Run after pull
```powershell
cd PlanoraMobile
npm install --legacy-peer-deps
npm run android
```

Rebuild native app after dependency changes.
