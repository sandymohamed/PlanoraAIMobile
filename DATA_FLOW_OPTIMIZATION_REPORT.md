# Frontend Data Flow Optimization Report

## Goal

Make successful user actions feel instant by updating local frontend state directly after API success instead of refetching whole collections.

Constraints preserved:

- Zustand remains the state layer.
- Backend API endpoints are unchanged.
- Existing navigation, validation, permissions, pagination, filtering, search, sorting, animations, and error messages are preserved.
- Screen entry, pull-to-refresh, app relaunch, and session restore still fetch from the backend.

## Refetches Found

### Removed

- `src/hooks/useCalendarData.ts`
  - `completeCalendarTask` called `updateTask(...)` and then `fetchTasks()`.
  - Removed the full task refetch because `taskStore.updateTask` already merges the updated task into Zustand and reapplies filters.

- `src/screens/goals/GoalDetailScreen.tsx`
  - `toggleMilestoneComplete` called milestone mutation and then `fetchGoal(goalId)`.
  - Removed the goal refetch because `goalStore.updateMilestone` and `goalStore.completeMilestone` now update milestones and progress locally.

- `src/screens/goals/GoalDetailScreen.tsx`
  - `saveMilestone` called create/update milestone and then `fetchGoal(goalId)`.
  - Removed the goal refetch because `goalStore.createMilestone` and `goalStore.updateMilestone` now keep `currentGoal` and `goals` in sync locally.

- `src/screens/goals/GoalDetailScreen.tsx`
  - Milestone delete confirmation called `deleteMilestone(...).then(() => fetchGoal(goalId))`.
  - Removed the goal refetch because `goalStore.deleteMilestone` now removes the milestone locally and recalculates progress.

- `src/screens/goals/GoalDetailScreen.tsx`
  - `onGenerateAI` called `generateAIPlan(goalId)` and then `fetchGoal(goalId)`.
  - Removed the goal refetch because `goalStore.generateAIPlan` now merges returned milestones/tasks into `currentGoal`, `goals`, and `taskStore`.

- `src/screens/routines/RoutinesScreen.tsx`
  - `toggleTask` called `routineService.toggleTaskCompletion(...)` and then `loadRoutines()`.
  - Removed the routine-list refetch. The returned `RoutineTask` is merged into the local `routines` state.

- `src/screens/routines/RoutinesScreen.tsx`
  - `resetRoutine` called `routineService.resetRoutine(...)` and then `loadRoutines()`.
  - Removed the routine-list refetch. The local routine task list is reset after API success.

- `src/screens/routines/RoutinesScreen.tsx`
  - `deleteRoutine` called `routineService.deleteRoutine(...)` and then `loadRoutines()`.
  - Removed the routine-list refetch. The deleted routine is removed from local state after API success.

### Retained Intentionally

- `src/screens/routines/RoutineCreateScreen.tsx`
  - Keeps delayed `fetchAlarms(1, 1000, true)` after routine creation.
  - Reason: the backend may create routine reminder alarms, but the routine API response does not include created alarm IDs/payloads.

- `src/screens/routines/RoutineEditScreen.tsx`
  - Keeps delayed `fetchAlarms(1, 1000, true)` after routine edit.
  - Reason: schedule/reminder changes can update backend-generated alarms that are not identifiable from the routine response.

- `src/screens/routines/RoutinesScreen.tsx`
  - Keeps non-blocking `fetchAlarms(1, 1000, true)` after routine delete.
  - Reason: alarms have `linkedTaskId` but no `linkedRoutineId`, so the frontend cannot safely remove only the affected routine alarms.

- `src/store/taskStore.ts`
  - Keeps delayed alarm refreshes after task create/update when due date or due time changes.
  - Reason: backend creates/updates linked task alarms asynchronously, and the task response does not include the alarm payload.

- `src/store/taskStore.ts`
  - Keeps `fetchTasks -> fetchAlarms` scheduling sync.
  - Reason: this is not a CRUD-after-success collection refetch; it is a cross-store native alarm scheduling sync. It should be optimized later with alarm payloads or a diff-based alarm sync.

## Files Modified

- `src/store/goalStore.ts`
- `src/screens/goals/GoalDetailScreen.tsx`
- `src/hooks/useCalendarData.ts`
- `src/screens/routines/RoutinesScreen.tsx`
- `src/types/task.ts`

## State Update Changes

### Goals And Milestones

`goalStore` now recalculates goal progress locally whenever milestones are created, updated, completed, or deleted.

Before:

```ts
await updateMilestone(goalId, milestoneId, payload);
await fetchGoal(goalId);
```

After:

```ts
await updateMilestone(goalId, milestoneId, payload);
```

The store now handles:

- Updating the milestone inside `goals`.
- Updating the milestone inside `currentGoal`.
- Recomputing `progress`.
- Reapplying filters.

### AI Plan Generation

`goalStore.generateAIPlan` now uses the POST response directly.

Before:

```ts
await goalService.generateAIPlan({ goalId, promptOptions });
const updatedGoal = await goalService.getGoal(goalId);
```

After:

```ts
const result = await goalService.generateAIPlan({ goalId, promptOptions });
const updatedGoal = withMilestones({ ...baseGoal, tasks: result.tasks }, result.milestones);
syncTasksIntoTaskStore(result.tasks);
```

This removes the second `GET /goals/:id` after AI generation and keeps Tasks/Calendar in sync by merging generated tasks into `taskStore`.

### Calendar Task Completion

Calendar no longer refetches all tasks after completing a regular task.

Before:

```ts
await updateTask(realId, { status: newStatus });
await fetchTasks();
```

After:

```ts
await updateTask(realId, { status: newStatus });
```

Routine calendar tasks now patch the hook's local `routines` state from the returned `RoutineTask`.

### Routines

`RoutinesScreen` now updates its local routine state after successful API calls.

Before:

```ts
await routineService.toggleTaskCompletion(taskId, !completed);
await loadRoutines();
```

After:

```ts
const updatedTask = await routineService.toggleTaskCompletion(taskId, !completed);
setRoutines((current) => patchRoutineTask(current, updatedTask));
```

Rollback behavior:

- The previous local routine array is captured before mutation.
- If the API request fails, the previous array is restored and the existing error dialog is shown.

## Estimated API Call Reduction

Per affected action:

- Calendar complete regular task: removes 1 `GET /tasks`.
- Goal milestone complete/uncomplete: removes 1 `GET /goals/:id`.
- Goal milestone create/update: removes 1 `GET /goals/:id`.
- Goal milestone delete: removes 1 `GET /goals/:id`.
- AI plan generation: removes 1 `GET /goals/:id`.
- Routine task toggle: removes 1 `GET /routines`.
- Routine reset: removes 1 `GET /routines`.
- Routine delete: removes 1 `GET /routines`.

Expected reduction in mutation-triggered refetches for these flows: about 50-100% depending on the action. Cross-store alarm sync requests remain until the backend returns enough alarm information to patch the alarm store directly.

## Expected Perceived Performance Improvement

High for goal detail and routine interactions:

- Milestone changes should reflect immediately after the mutation response, without waiting for a second goal fetch.
- AI plan generation avoids one extra network round trip after the expensive generation request completes.
- Routine checkbox/reset/delete interactions no longer wait for a full routine list reload.

Medium for calendar interactions:

- Completing a task from Calendar no longer waits for a full task refetch.

Overall expected improvement: noticeably faster post-action UI updates, especially on mobile networks.

## Verification

Commands/checks:

```bash
npx tsc --noEmit
```

Result:

```text
pass
```

Cursor diagnostics reported no linter errors for the modified files.

`npm run lint` is still unavailable because the project does not currently have `eslint` installed in `PlanoraMobile`.

## Follow-Up Work

To remove the remaining alarm refetches safely, the backend should return alarm payloads or affected alarm IDs from task/routine mutations. Then the frontend can patch `alarmStore` directly instead of calling `fetchAlarms`.

Recommended future API additions:

- Task create/update response includes created/updated linked alarm, if any.
- Routine create/update/delete response includes affected routine alarm IDs or alarm payloads.
- Alarm model includes a `linkedRoutineId` when generated from a routine reminder.
