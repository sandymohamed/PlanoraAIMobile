import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { useTaskStore } from '@/store/taskStore';
import { routineService } from '@/services/routineService';
import { reminderService, Reminder } from '@/services/reminderService';
import { Routine } from '@/types/routine';
import { Task, TaskPriority, TaskStatus } from '@/types/task';

export type CalendarViewMode = 'month' | 'week' | 'day';

export function useCalendarData() {
  const { tasks, fetchTasks, updateTask } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineReminders, setRoutineReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchTasks(), loadRoutines()]);
      setIsLoading(false);
    })();
  }, [fetchTasks, loadRoutines]);

  useEffect(() => {
    if (routines.length) loadRoutineReminders();
  }, [routines.length, loadRoutineReminders]);

  const enabledRoutines = useMemo(() => routines.filter((r) => r.enabled), [routines]);

  const getRoutineTasksForCalendarRange = useCallback(
    (startDate: Date, endDate: Date): Task[] => {
      const routineTasks: Task[] = [];
      const now = new Date();

      enabledRoutines.forEach((routine) => {
        const schedule = routine.schedule as { time?: string; days?: number[]; day?: number };
        const timeParts = schedule.time?.split(':') || ['0', '0'];
        const hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);

        routine.routineTasks?.forEach((routineTask) => {
          const pushInstance = (loopDate: Date, extra?: Partial<Task['metadata']>) => {
            const taskDate = new Date(loopDate);
            taskDate.setHours(hour, minute, 0, 0);
            const isCompletedOnDate =
              routineTask.completed &&
              routineTask.completedAt &&
              isSameDay(new Date(routineTask.completedAt), loopDate);
            routineTasks.push({
              id: `routine_${routineTask.id}_${format(loopDate, 'yyyy-MM-dd')}`,
              title: routineTask.title,
              description: routineTask.description,
              status: isCompletedOnDate ? TaskStatus.DONE : TaskStatus.TODO,
              priority:
                !isCompletedOnDate && taskDate < now ? TaskPriority.URGENT : TaskPriority.MEDIUM,
              dueDate: taskDate.toISOString(),
              dueTime: schedule.time,
              createdBy: routine.userId,
              tags: ['routine'],
              order: routineTask.order,
              metadata: {
                routineId: routine.id,
                routineTaskId: routineTask.id,
                routineTitle: routine.title,
                isRoutineTask: true,
                ...extra,
              },
              createdAt: routineTask.createdAt,
              updatedAt: routineTask.updatedAt,
              isDeleted: false,
            });
          };

          if (routine.frequency === 'DAILY') {
            const loop = new Date(startDate);
            while (loop <= endDate) {
              pushInstance(loop);
              loop.setDate(loop.getDate() + 1);
            }
          } else if (routine.frequency === 'WEEKLY' && schedule.days?.length) {
            const loop = new Date(startDate);
            while (loop <= endDate) {
              if (schedule.days.includes(loop.getDay())) {
                pushInstance(loop, { scheduledDay: loop.getDay() });
              }
              loop.setDate(loop.getDate() + 1);
            }
          } else if (routine.frequency === 'MONTHLY' && schedule.day) {
            const loop = new Date(startDate);
            while (loop <= endDate) {
              if (loop.getDate() === schedule.day) pushInstance(loop);
              loop.setDate(loop.getDate() + 1);
            }
          }
        });
      });

      return routineTasks;
    },
    [enabledRoutines]
  );

  const getDateRange = useCallback(() => {
    if (viewMode === 'month') {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      return { start: startOfWeek(ms, { weekStartsOn: 0 }), end: endOfWeek(me, { weekStartsOn: 0 }) };
    }
    if (viewMode === 'week') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      };
    }
    return { start: selectedDate, end: selectedDate };
  }, [viewMode, currentDate, selectedDate]);

  const allCalendarItems = useMemo(() => {
    const { start, end } = getDateRange();
    const regular = tasks.filter((t) => !t.metadata?.isRoutineTask);
    const routineInstances = getRoutineTasksForCalendarRange(start, end);
    const map = new Map<string, Task>();
    [...regular, ...routineInstances].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [tasks, getDateRange, getRoutineTasksForCalendarRange]);

  const getTasksForDate = useCallback(
    (date: Date) =>
      allCalendarItems.filter((item) => item.dueDate && isSameDay(new Date(item.dueDate), date)),
    [allCalendarItems]
  );

  const getTasksForMonth = useCallback(
    (date: Date) => {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      const monthTasks: Record<string, Task[]> = {};
      days.forEach((day) => {
        monthTasks[format(day, 'yyyy-MM-dd')] = getTasksForDate(day);
      });
      return { days, monthTasks };
    },
    [getTasksForDate]
  );

  const getTasksForWeek = useCallback(
    (startDate: Date) => {
      const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      const weekTasks: Record<string, Task[]> = {};
      weekDays.forEach((day) => {
        weekTasks[format(day, 'yyyy-MM-dd')] = getTasksForDate(day);
      });
      return { weekDays, weekTasks };
    },
    [getTasksForDate]
  );

  const monthData = useMemo(() => getTasksForMonth(currentDate), [currentDate, getTasksForMonth]);
  const weekData = useMemo(
    () => getTasksForWeek(startOfWeek(selectedDate, { weekStartsOn: 0 })),
    [selectedDate, getTasksForWeek]
  );
  const dayTasks = useMemo(() => getTasksForDate(selectedDate), [selectedDate, getTasksForDate]);

  const completeCalendarTask = useCallback(
    async (task: Task) => {
      if (task.metadata?.isRoutineTask) {
        const taskId = task.metadata.routineTaskId;
        if (taskId) {
          await routineService.toggleTaskCompletion(taskId, task.status !== TaskStatus.DONE);
          await loadRoutines();
        }
        return;
      }
      const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
      await updateTask(task.id, { status: newStatus });
      await fetchTasks();
    },
    [updateTask, fetchTasks, loadRoutines]
  );

  return {
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    isLoading,
    monthData,
    weekData,
    dayTasks,
    allCalendarItems,
    routineReminders,
    completeCalendarTask,
    refresh: async () => {
      await Promise.all([fetchTasks(), loadRoutines(), loadRoutineReminders()]);
    },
  };
}
