import { useState, useEffect, useMemo, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import {
  format,
  differenceInHours,
  differenceInMinutes,
  differenceInDays,
  isSameDay,
} from 'date-fns';
import { useTaskStore } from '@/store/taskStore';
import { useGoalStore } from '@/store/goalStore';
import { useAlarmStore } from '@/store/alarmStore';
import { routineService } from '@/services/routineService';
import { reminderService, Reminder } from '@/services/reminderService';
import { Routine } from '@/types/routine';
import { Task, TaskStatus } from '@/types/task';
import {
  CalendarViewMode,
  buildCalendarItems,
  buildMonthRemindersMap,
  getCalendarDateRange,
  getMonthGridDays,
  getRemindersForDate,
  getWeekDays,
  groupTasksByDayKey,
  sortTasksByDueTime,
  getTaskHour,
} from '@/utils/calendarEngine';

export type { CalendarViewMode };

type CalendarRefreshOptions = {
  blocking?: boolean;
  includeAlarms?: boolean;
};

export function useCalendarData() {
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const goals = useGoalStore((s) => s.goals);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const alarms = useAlarmStore((s) => s.alarms);
  const fetchAlarms = useAlarmStore((s) => s.fetchAlarms);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineReminders, setRoutineReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadRoutines = useCallback(async () => {
    try {
      const data = await routineService.getUserRoutines();
      setRoutines(data.filter((r) => r.enabled));
    } catch {
      setRoutines([]);
    }
  }, []);

  const loadRoutineReminders = useCallback(async () => {
    try {
      const reminders = await reminderService.getUpcomingReminders();
      setRoutineReminders(
        reminders.filter((r) => r.schedule?.routineId && r.title?.includes('Routine'))
      );
    } catch {
      setRoutineReminders([]);
    }
  }, []);

  const refresh = useCallback(async (options: CalendarRefreshOptions = {}) => {
    const { blocking = true, includeAlarms = false } = options;
    if (blocking) setIsLoading(true);
    else setIsSyncing(true);

    try {
      await Promise.all([
        fetchTasks({ skipAlarmSync: true }),
        fetchGoals(1, 100),
        loadRoutines(),
        loadRoutineReminders(),
      ]);

      if (includeAlarms) {
        await fetchAlarms(1, 500, true, 0, { scheduleNative: false });
      }
    } finally {
      if (blocking) setIsLoading(false);
      else setIsSyncing(false);
    }
  }, [fetchTasks, fetchGoals, fetchAlarms, loadRoutines, loadRoutineReminders]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      refresh({ blocking: false, includeAlarms: false }).catch(() => {});
      fetchAlarms(1, 500, true, 0, { scheduleNative: false }).catch(() => {});
    });
    return () => task.cancel();
  }, [fetchAlarms, refresh]);

  const dateRange = useMemo(
    () => getCalendarDateRange(viewMode, currentDate, selectedDate),
    [viewMode, currentDate, selectedDate]
  );

  const enabledRoutines = useMemo(() => routines.filter((r) => r.enabled), [routines]);

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
    [tasks, goals, routines, alarms, dateRange.start, dateRange.end]
  );

  const monthRemindersMap = useMemo(() => {
    if (viewMode !== 'month' && viewMode !== 'agenda') return new Map();
    return buildMonthRemindersMap(
      routineReminders,
      enabledRoutines,
      dateRange.start,
      dateRange.end
    );
  }, [viewMode, routineReminders, enabledRoutines, dateRange]);

  const getTasksForDate = useCallback(
    (date: Date) =>
      allCalendarItems
        .filter((item) => item.dueDate && isSameDay(new Date(item.dueDate), date))
        .sort(sortTasksByDueTime),
    [allCalendarItems]
  );

  const monthData = useMemo(() => {
    const days = getMonthGridDays(currentDate);
    return { days, monthTasks: groupTasksByDayKey(allCalendarItems, days) };
  }, [currentDate, allCalendarItems]);

  const weekData = useMemo(() => {
    const weekDays = getWeekDays(selectedDate);
    return { weekDays, weekTasks: groupTasksByDayKey(allCalendarItems, weekDays) };
  }, [selectedDate, allCalendarItems]);

  const dayTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate, getTasksForDate]);

  const dayReminders = useMemo(
    () =>
      getRemindersForDate(
        selectedDate,
        viewMode,
        monthRemindersMap,
        routineReminders,
        enabledRoutines
      ),
    [selectedDate, viewMode, monthRemindersMap, routineReminders, enabledRoutines]
  );

  const agendaItems = useMemo(() => {
    const items = [...allCalendarItems].sort(sortTasksByDueTime);
    const byDay: Record<string, Task[]> = {};
    items.forEach((t) => {
      if (!t.dueDate) return;
      const key = format(new Date(t.dueDate), 'yyyy-MM-dd');
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
      if (task.metadata?.isRoutineTask && task.metadata.routineTaskId) {
        const updatedRoutineTask = await routineService.toggleTaskCompletion(
          task.metadata.routineTaskId,
          task.status !== TaskStatus.DONE
        );
        setRoutines((current) =>
          current.map((routine) =>
            routine.id === updatedRoutineTask.routineId
              ? {
                  ...routine,
                  routineTasks: routine.routineTasks.map((routineTask) =>
                    routineTask.id === updatedRoutineTask.id ? updatedRoutineTask : routineTask
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : routine
          )
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
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      await updateTask(realId, { status: newStatus });
    },
    [updateTask]
  );

  const getRemindersOnDay = useCallback(
    (date: Date) =>
      getRemindersForDate(date, viewMode, monthRemindersMap, routineReminders, enabledRoutines),
    [viewMode, monthRemindersMap, routineReminders, enabledRoutines]
  );

  const getTimeUntil = useCallback((dueDate: string) => {
    const now = new Date();
    const taskDate = new Date(dueDate);
    const mins = differenceInMinutes(taskDate, now);
    const hrs = differenceInHours(taskDate, now);
    const days = differenceInDays(taskDate, now);
    if (mins < 0) return 'Overdue';
    if (mins < 60) return `${mins}m left`;
    if (hrs < 24) return `${hrs}h left`;
    if (days < 7) return `${days}d left`;
    return format(taskDate, 'MMM d');
  }, []);

  return useMemo(() => ({
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
    refresh,
  }), [
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
    refresh,
  ]);
}
