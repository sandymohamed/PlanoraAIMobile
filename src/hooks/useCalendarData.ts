import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  format,
  differenceInHours,
  differenceInMinutes,
  differenceInDays,
  isSameDay,
} from "date-fns";
import i18n, { formatDate } from "@/i18n";
import { useTaskStore } from "@/store/taskStore";
import { useGoalStore } from "@/store/goalStore";
import { useAlarmStore } from "@/store/alarmStore";
import { routineService } from "@/services/routineService";
import { routineEvents } from "@/services/routineEvents";
import { Routine } from "@/types/routine";
import { Task, TaskStatus } from "@/types/task";
import {
  CalendarViewMode,
  buildCalendarItems,
  getCalendarDateRange,
  getMonthGridDays,
  getWeekDays,
  groupTasksByDayKey,
  sortTasksByDueTime,
  getTaskHour,
} from "@/utils/calendarEngine";
import { setPendingAnalyticsContext } from "@/analytics/pendingContext";
import { syncIfNeeded, appSync } from "@/services/sync/appSync";

export type { CalendarViewMode };

type CalendarRefreshOptions = {
  blocking?: boolean;
  includeAlarms?: boolean;
};

export function useCalendarData() {
  // Read directly from stores - these will have cached data
  const tasks = useTaskStore((s) => s.tasks);
  const goals = useGoalStore((s) => s.goals);
  const alarms = useAlarmStore((s) => s.alarms);

  // Get store actions
  const taskStore = useTaskStore.getState();
  const goalStore = useGoalStore.getState();
  const alarmStore = useAlarmStore.getState();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // ✅ Add refs to prevent multiple sync calls
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const SYNC_DEBOUNCE_MS = 1000; // 1 second debounce
  const SYNC_COOLDOWN_MS = 3000; // 3 seconds cooldown between syncs

  const loadRoutines = useCallback(async () => {
    try {
      const data = await routineService.getUserRoutines();
      setRoutines(data.filter((r) => r.enabled));
    } catch {
      setRoutines([]);
    }
  }, []);

  // Load routines on mount
  useEffect(() => {
    loadRoutines().catch(() => {});
  }, [loadRoutines]);

  // ✅ Force refresh - called explicitly by user (pull to refresh)
  const forceRefresh = useCallback(
    async (options: CalendarRefreshOptions = {}) => {
      const { includeAlarms = false } = options;

      setIsLoading(true);
      console.log("Force refreshing calendar data...");

      try {
        await appSync.refreshAll({ force: true, silent: false, includeAlarms });
        await loadRoutines();
        lastSyncTimeRef.current = Date.now();
      } finally {
        setIsLoading(false);
      }
    },
    [loadRoutines],
  );

  // ✅ Background refresh with debounce and cooldown
  const refreshInBackground = useCallback(async () => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      console.log("Sync already in progress, skipping");
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - lastSyncTimeRef.current < SYNC_COOLDOWN_MS) {
      console.log("Sync cooldown active, skipping");
      return;
    }

    // Clear any pending sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    // Debounce the sync
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        isSyncingRef.current = true;
        setIsSyncing(true);
        
        console.log("Background refresh starting...");
        await syncIfNeeded();
        await loadRoutines();
        lastSyncTimeRef.current = Date.now();
        
        console.log("Background refresh completed");
      } catch (error) {
        console.error("Background refresh failed:", error);
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
        syncTimeoutRef.current = null;
      }
    }, SYNC_DEBOUNCE_MS);
  }, [loadRoutines]);

  // ✅ Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, []);

  // Listen for routine deletions
  useEffect(() => {
    const unsubscribe = routineEvents.onDeleted((routineId) => {
      setRoutines((current) =>
        current.filter((routine) => routine.id !== routineId),
      );
      // Refresh alarms in background (with debounce)
      if (alarmStore.needsRefresh && alarmStore.needsRefresh()) {
        const now = Date.now();
        if (now - lastSyncTimeRef.current > SYNC_COOLDOWN_MS) {
          alarmStore.fetchAlarms(1, 500, true).catch(() => {});
          lastSyncTimeRef.current = now;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [alarmStore]);

  const dateRange = useMemo(
    () => getCalendarDateRange(viewMode, currentDate, selectedDate),
    [viewMode, currentDate, selectedDate],
  );

  const allCalendarItems = useMemo(
    () =>
      buildCalendarItems({
        tasks,
        goals,
        routines,
        alarms,
        rangeStart: dateRange.start,
        rangeEnd: dateRange.end,
      }),
    [tasks, goals, routines, alarms, dateRange.start, dateRange.end],
  );

  const getTasksForDate = useCallback(
    (date: Date) =>
      allCalendarItems
        .filter(
          (item) => item.dueDate && isSameDay(new Date(item.dueDate), date),
        )
        .sort(sortTasksByDueTime),
    [allCalendarItems],
  );

  const monthData = useMemo(() => {
    const days = getMonthGridDays(currentDate);
    return { days, monthTasks: groupTasksByDayKey(allCalendarItems, days) };
  }, [currentDate, allCalendarItems]);

  const weekData = useMemo(() => {
    const weekDays = getWeekDays(selectedDate);
    return {
      weekDays,
      weekTasks: groupTasksByDayKey(allCalendarItems, weekDays),
    };
  }, [selectedDate, allCalendarItems]);

  const dayTasks = useMemo(
    () => getTasksForDate(selectedDate),
    [selectedDate, getTasksForDate],
  );

  const dayReminders = useMemo(() => [], []);

  const agendaItems = useMemo(() => {
    const items = [...allCalendarItems].sort(sortTasksByDueTime);
    const byDay: Record<string, Task[]> = {};
    items.forEach((t) => {
      if (!t.dueDate) return;
      const key = format(new Date(t.dueDate), "yyyy-MM-dd");
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(t);
    });
    return Object.keys(byDay)
      .sort()
      .map((key) => ({ day: key, tasks: byDay[key] }));
  }, [allCalendarItems]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return allCalendarItems
      .filter((item) => {
        if (!item.dueDate || item.status === TaskStatus.DONE) return false;
        const diff = differenceInHours(new Date(item.dueDate), now);
        return diff >= 0 && diff <= 24;
      })
      .sort(sortTasksByDueTime);
  }, [allCalendarItems]);

  const completeCalendarTask = useCallback(
    async (task: Task) => {
      if (task.metadata?.isRoutineEvent) {
        return;
      }
      if (task.metadata?.isRoutineTask && task.metadata.routineTaskId) {
        const updatedRoutineTask = await routineService.toggleTaskCompletion(
          task.metadata.routineTaskId,
          task.status !== TaskStatus.DONE,
        );
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === updatedRoutineTask.routineId
              ? {
                  ...routine,
                  routineTasks: routine.routineTasks.map((routineTask) =>
                    routineTask.id === updatedRoutineTask.id
                      ? updatedRoutineTask
                      : routineTask,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : routine,
          ),
        );
        return;
      }
      if (task.metadata?.isGoalMilestone || task.metadata?.isGoalTarget) {
        return;
      }
      if (task.metadata?.isAlarm) {
        return;
      }
      const realId = task.metadata?.recurrenceParentId || task.id;
      const newStatus =
        task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      setPendingAnalyticsContext({
        calendarEventAction: "updated",
        taskCompleteSource: "calendar",
      });
      await taskStore.updateTask(realId, { status: newStatus });
    },
    [taskStore],
  );

  const getRemindersOnDay = useCallback((_date: Date) => [], []);

  const getTimeUntil = useCallback((dueDate: string) => {
    const now = new Date();
    const taskDate = new Date(dueDate);
    const mins = differenceInMinutes(taskDate, now);
    const hrs = differenceInHours(taskDate, now);
    const days = differenceInDays(taskDate, now);
    if (mins < 0) return i18n.t("calendar.overdue");
    if (mins < 60) return i18n.t("calendar.minutesLeft", { count: mins });
    if (hrs < 24) return i18n.t("calendar.hoursLeft", { count: hrs });
    if (days < 7) return i18n.t("calendar.daysLeft", { count: days });
    return formatDate(taskDate, { month: "short", day: "numeric" });
  }, []);

  return useMemo(
    () => ({
      currentDate,
      setCurrentDate,
      viewMode,
      setViewMode,
      selectedDate,
      setSelectedDate,
      isLoading,
      isSyncing,
      monthData,
      weekData,
      dayTasks,
      dayReminders,
      agendaItems,
      upcomingTasks,
      allCalendarItems,
      completeCalendarTask,
      getRemindersOnDay,
      getTaskHour,
      getTimeUntil,
      forceRefresh,
      refreshInBackground,
    }),
    [
      currentDate,
      viewMode,
      selectedDate,
      isLoading,
      isSyncing,
      monthData,
      weekData,
      dayTasks,
      dayReminders,
      agendaItems,
      upcomingTasks,
      allCalendarItems,
      completeCalendarTask,
      getRemindersOnDay,
      getTimeUntil,
      forceRefresh,
      refreshInBackground,
    ],
  );
}