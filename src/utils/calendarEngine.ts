import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addDays,
} from 'date-fns';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { Goal, GoalStatus, MilestoneStatus } from '@/types/goal';
import { Routine } from '@/types/routine';
import { Alarm } from '@/types/alarm';
import { Reminder } from '@/services/reminderService';

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarDateRange {
  start: Date;
  end: Date;
}

export interface DayReminderEntry {
  date: Date;
  reminder: Reminder;
}

/** Visible range for month/week/day/agenda */
export function getCalendarDateRange(
  viewMode: CalendarViewMode,
  currentDate: Date,
  selectedDate: Date
): CalendarDateRange {
  if (viewMode === 'month' || viewMode === 'agenda') {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    return {
      start: startOfWeek(ms, { weekStartsOn: 0 }),
      end: endOfWeek(me, { weekStartsOn: 0 }),
    };
  }
  if (viewMode === 'week') {
    return {
      start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    };
  }
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);
  return { start: dayStart, end: dayEnd };
}

function parseRecurrenceStep(rule: string): { unit: 'day' | 'week' | 'month' | 'year'; interval: number } | null {
  const r = rule.trim();
  if (!r || r === 'none') return null;
  const lower = r.toLowerCase();
  if (lower === 'daily' || r.includes('FREQ=DAILY')) return { unit: 'day', interval: 1 };
  if (lower === 'weekly' || r.includes('FREQ=WEEKLY')) return { unit: 'week', interval: 1 };
  if (lower === 'monthly' || r.includes('FREQ=MONTHLY')) return { unit: 'month', interval: 1 };
  if (lower === 'yearly' || r.includes('FREQ=YEARLY')) return { unit: 'year', interval: 1 };
  const intervalMatch = r.match(/INTERVAL=(\d+)/i);
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;
  if (r.includes('FREQ=DAILY')) return { unit: 'day', interval };
  if (r.includes('FREQ=WEEKLY')) return { unit: 'week', interval };
  if (r.includes('FREQ=MONTHLY')) return { unit: 'month', interval };
  if (r.includes('FREQ=YEARLY')) return { unit: 'year', interval };
  return null;
}

/** Expand recurring tasks into dated instances inside [start, end]. */
export function expandTaskRecurrences(task: Task, rangeStart: Date, rangeEnd: Date): Task[] {
  if (!task.dueDate || task.status === TaskStatus.DONE || task.status === TaskStatus.ARCHIVED) {
    return task.dueDate ? [task] : [];
  }
  const rule = task.recurrenceRule;
  if (!rule || rule === 'none') {
    const d = new Date(task.dueDate);
    return d >= rangeStart && d <= rangeEnd ? [task] : d < rangeStart ? [] : [task];
  }

  const step = parseRecurrenceStep(rule);
  if (!step) {
    const d = new Date(task.dueDate);
    return isInRange(d, rangeStart, rangeEnd) ? [task] : [];
  }

  const base = new Date(task.dueDate);
  const instances: Task[] = [];
  let cursor = new Date(base);

  while (cursor < rangeStart) {
    cursor = advanceDate(cursor, step);
    if (instances.length > 500) break;
  }

  let guard = 0;
  while (cursor <= rangeEnd && guard < 500) {
    guard += 1;
    if (cursor >= rangeStart) {
      instances.push({
        ...task,
        id: `${task.id}_${format(cursor, 'yyyy-MM-dd')}`,
        dueDate: mergeDateTime(cursor, task.dueDate, task.dueTime).toISOString(),
        metadata: { ...task.metadata, recurrenceInstance: true, recurrenceParentId: task.id },
      });
    }
    cursor = advanceDate(cursor, step);
  }

  return instances.length ? instances : isInRange(base, rangeStart, rangeEnd) ? [task] : [];
}

function isInRange(d: Date, start: Date, end: Date): boolean {
  return d >= start && d <= end;
}

function advanceDate(d: Date, step: { unit: 'day' | 'week' | 'month' | 'year'; interval: number }): Date {
  const next = new Date(d);
  if (step.unit === 'day') next.setDate(next.getDate() + step.interval);
  else if (step.unit === 'week') next.setDate(next.getDate() + 7 * step.interval);
  else if (step.unit === 'month') next.setMonth(next.getMonth() + step.interval);
  else next.setFullYear(next.getFullYear() + step.interval);
  return next;
}

function mergeDateTime(day: Date, dueDateIso: string, dueTime?: string): Date {
  const merged = new Date(day);
  if (dueTime) {
    const [h, m] = dueTime.split(':').map(Number);
    merged.setHours(h, m, 0, 0);
    return merged;
  }
  const original = new Date(dueDateIso);
  merged.setHours(original.getHours(), original.getMinutes(), 0, 0);
  return merged;
}

export function goalsToCalendarTasks(goals: Goal[]): Task[] {
  const items: Task[] = [];
  goals.forEach((goal) => {
    goal.milestones?.forEach((milestone) => {
      const date = milestone.targetDate;
      if (
        !date ||
        milestone.status === MilestoneStatus.DONE ||
        milestone.status === MilestoneStatus.CANCELLED
      ) {
        return;
      }
      items.push({
        id: `goal_milestone_${milestone.id}`,
        title: milestone.title,
        description: milestone.description,
        status:
          milestone.status === MilestoneStatus.IN_PROGRESS
            ? TaskStatus.IN_PROGRESS
            : TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: date,
        goalId: goal.id,
        createdBy: goal.userId,
        tags: ['goal', 'milestone'],
        order: milestone.order || 0,
        metadata: {
          isGoalMilestone: true,
          goalTitle: goal.title,
          milestoneId: milestone.id,
        },
        createdAt: milestone.createdAt,
        updatedAt: milestone.updatedAt,
        isDeleted: false,
      });
    });
    if (
      goal.targetDate &&
      goal.status !== GoalStatus.DONE &&
      goal.status !== GoalStatus.CANCELLED
    ) {
      items.push({
        id: `goal_target_${goal.id}`,
        title: `Goal: ${goal.title}`,
        description: goal.description,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: goal.targetDate,
        goalId: goal.id,
        createdBy: goal.userId,
        tags: ['goal', 'target'],
        order: 0,
        metadata: { isGoalTarget: true, goalTitle: goal.title },
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
        isDeleted: false,
      });
    }
  });
  return items;
}

export function routinesToCalendarTasks(
  routines: Routine[],
  alarms: Alarm[],
  rangeStart: Date,
  rangeEnd: Date
): Task[] {
  const routineEvents: Task[] = [];
  const now = new Date();
  const enabledRoutineAlarmTitles = new Set(
    alarms
      .filter((alarm) => alarm.enabled && alarm.title.startsWith('Routine: '))
      .map((alarm) => alarm.title.replace(/^Routine:\s*/, '').trim().toLowerCase())
  );

  routines
    .filter((r) => r.enabled)
    .forEach((routine) => {
      const schedule = routine.schedule as { time?: string; days?: number[]; day?: number };
      const timeParts = schedule.time?.split(':') || ['0', '0'];
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);

      const tasks = routine.routineTasks || [];
      const hasAlarm = enabledRoutineAlarmTitles.has(routine.title.trim().toLowerCase());
      const hasReminder = Boolean(routine.reminderBefore);

      const pushInstance = (loopDate: Date, extra?: Record<string, unknown>) => {
        const taskDate = new Date(loopDate);
        taskDate.setHours(hour, minute, 0, 0);
        const completedOnDate = tasks.filter(
          (task) => task.completed && task.completedAt && isSameDay(new Date(task.completedAt), loopDate)
        ).length;
        const allDoneOnDate = tasks.length > 0 && completedOnDate === tasks.length;

        routineEvents.push({
          id: `routine_${routine.id}_${format(loopDate, 'yyyy-MM-dd')}`,
          title: routine.title,
          description: routine.description || `${tasks.length} routine task${tasks.length === 1 ? '' : 's'}`,
          status: allDoneOnDate ? TaskStatus.DONE : TaskStatus.TODO,
          priority: !allDoneOnDate && taskDate < now ? TaskPriority.URGENT : TaskPriority.MEDIUM,
          dueDate: taskDate.toISOString(),
          dueTime: schedule.time,
          createdBy: routine.userId,
          tags: ['routine'],
          order: 0,
          metadata: {
            routineId: routine.id,
            routineTitle: routine.title,
            routineTaskCount: tasks.length,
            routineCompletedCount: completedOnDate,
            routineReminderBefore: routine.reminderBefore,
            routineHasReminder: hasReminder,
            routineHasAlarm: hasAlarm,
            isRoutineTask: true,
            isRoutineEvent: true,
            ...extra,
          },
          createdAt: routine.createdAt,
          updatedAt: routine.updatedAt,
          isDeleted: false,
        });
      };

      if (routine.frequency === 'DAILY') {
        const loop = new Date(rangeStart);
        while (loop <= rangeEnd) {
          pushInstance(loop);
          loop.setDate(loop.getDate() + 1);
        }
      } else if (routine.frequency === 'WEEKLY' && schedule.days?.length) {
        const loop = new Date(rangeStart);
        while (loop <= rangeEnd) {
          if (schedule.days.includes(loop.getDay())) {
            pushInstance(loop, { scheduledDay: loop.getDay() });
          }
          loop.setDate(loop.getDate() + 1);
        }
      } else if (routine.frequency === 'MONTHLY' && schedule.day) {
        const loop = new Date(rangeStart);
        while (loop <= rangeEnd) {
          if (loop.getDate() === schedule.day) pushInstance(loop);
          loop.setDate(loop.getDate() + 1);
        }
      } else if (routine.frequency === 'YEARLY' && schedule.day) {
        const loop = new Date(rangeStart);
        while (loop <= rangeEnd) {
          if (loop.getDate() === schedule.day && loop.getMonth() === (schedule as { month?: number }).month) {
            pushInstance(loop);
          }
          loop.setDate(loop.getDate() + 1);
        }
      }
    });

  return routineEvents;
}

export function alarmsToCalendarTasks(alarms: Alarm[], rangeStart: Date, rangeEnd: Date): Task[] {
  const items: Task[] = [];
  const enabled = alarms.filter((a) => a.enabled);

  enabled.forEach((alarm) => {
    const base = new Date(alarm.time);
    const step = parseRecurrenceStep(alarm.recurrenceRule || 'none');

    const push = (at: Date) => {
      if (at < rangeStart || at > rangeEnd) return;
      items.push({
        id: `alarm_${alarm.id}_${format(at, 'yyyy-MM-dd-HHmm')}`,
        title: alarm.title,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: at.toISOString(),
        createdBy: alarm.userId,
        tags: ['alarm'],
        order: 0,
        metadata: {
          isAlarm: true,
          alarmId: alarm.id,
          linkedTaskId: alarm.linkedTaskId,
          recurrenceRule: alarm.recurrenceRule,
        },
        createdAt: alarm.createdAt,
        updatedAt: alarm.updatedAt,
        isDeleted: false,
      });
    };

    if (!step) {
      push(base);
      return;
    }

    let cursor = new Date(base);
    let guard = 0;
    while (cursor < rangeStart && guard < 500) {
      cursor = advanceDate(cursor, step);
      guard += 1;
    }
    guard = 0;
    while (cursor <= rangeEnd && guard < 500) {
      push(cursor);
      cursor = advanceDate(cursor, step);
      guard += 1;
    }
  });

  return items;
}

export function buildMonthRemindersMap(
  routineReminders: Reminder[],
  enabledRoutines: Routine[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, DayReminderEntry[]> {
  const map = new Map<string, DayReminderEntry[]>();
  const enabledReminders = routineReminders.filter((reminder) => {
    const routineId = reminder.schedule?.routineId;
    if (!routineId) return false;
    return enabledRoutines.some((r) => r.id === routineId && r.enabled);
  });

  enabledReminders.forEach((reminder) => {
    const schedule = reminder.schedule;
    if (!schedule?.time || !schedule?.routineId) return;

    const [routineHours, routineMinutes] = schedule.time.split(':').map(Number);
    const loopDate = new Date(rangeStart);

    while (loopDate <= rangeEnd) {
      let routineOccurrence: Date | null = null;

      if (schedule.frequency === 'DAILY') {
        routineOccurrence = new Date(loopDate);
        routineOccurrence.setHours(routineHours, routineMinutes, 0, 0);
      } else if (schedule.frequency === 'WEEKLY' && schedule.days?.length) {
        if (schedule.days.includes(loopDate.getDay())) {
          routineOccurrence = new Date(loopDate);
          routineOccurrence.setHours(routineHours, routineMinutes, 0, 0);
        }
      } else if (schedule.frequency === 'MONTHLY' && schedule.day) {
        if (loopDate.getDate() === schedule.day) {
          routineOccurrence = new Date(loopDate);
          routineOccurrence.setHours(routineHours, routineMinutes, 0, 0);
        }
      }

      if (routineOccurrence) {
        let reminderDate = new Date(routineOccurrence);
        if (schedule.reminderBefore) {
          const match = schedule.reminderBefore.match(/^(\d+)([mhdw])$/);
          if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2];
            if (unit === 'm') reminderDate.setMinutes(reminderDate.getMinutes() - value);
            else if (unit === 'h') reminderDate.setHours(reminderDate.getHours() - value);
            else if (unit === 'd') reminderDate.setDate(reminderDate.getDate() - value);
            else if (unit === 'w') reminderDate.setDate(reminderDate.getDate() - value * 7);
          }
        }
        if (reminderDate >= rangeStart && reminderDate <= rangeEnd) {
          const dayKey = format(reminderDate, 'yyyy-MM-dd');
          if (!map.has(dayKey)) map.set(dayKey, []);
          map.get(dayKey)!.push({ date: reminderDate, reminder });
        }
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }
  });

  return map;
}

export function getRemindersForDate(
  date: Date,
  viewMode: CalendarViewMode,
  monthRemindersMap: Map<string, DayReminderEntry[]>,
  routineReminders: Reminder[],
  enabledRoutines: Routine[]
): DayReminderEntry[] {
  const dayKey = format(date, 'yyyy-MM-dd');
  if ((viewMode === 'month' || viewMode === 'agenda') && monthRemindersMap.size > 0) {
    return monthRemindersMap.get(dayKey) || [];
  }
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const map = buildMonthRemindersMap(routineReminders, enabledRoutines, start, end);
  return map.get(dayKey) || [];
}

export interface BuildCalendarItemsInput {
  tasks: Task[];
  goals: Goal[];
  routines: Routine[];
  alarms: Alarm[];
  rangeStart: Date;
  rangeEnd: Date;
}

/** Merge all sources into deduplicated calendar tasks. */
export function buildCalendarItems(input: BuildCalendarItemsInput): Task[] {
  const { tasks, goals, routines, alarms, rangeStart, rangeEnd } = input;
  const regular = tasks.filter((t) => !t.metadata?.isRoutineTask);
  const visibleAlarms = alarms.filter((alarm) => !alarm.title.startsWith('Routine: '));

  const expandedTasks: Task[] = [];
  regular.forEach((t) => {
    expandedTasks.push(...expandTaskRecurrences(t, rangeStart, rangeEnd));
  });

  const map = new Map<string, Task>();
  [
    ...expandedTasks,
    ...routinesToCalendarTasks(routines, alarms, rangeStart, rangeEnd),
    ...goalsToCalendarTasks(goals),
    ...alarmsToCalendarTasks(visibleAlarms, rangeStart, rangeEnd),
  ].forEach((item) => {
    if (item.id) map.set(item.id, item);
  });

  return Array.from(map.values());
}

export function groupTasksByDayKey(items: Task[], days: Date[]): Record<string, Task[]> {
  const out: Record<string, Task[]> = {};
  days.forEach((day) => {
    out[format(day, 'yyyy-MM-dd')] = items.filter(
      (item) => item.dueDate && isSameDay(new Date(item.dueDate), day)
    );
  });
  return out;
}

export function getMonthGridDays(currentDate: Date): Date[] {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

export function getWeekDays(selectedDate: Date): Date[] {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function sortTasksByDueTime(a: Task, b: Task): number {
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

export function getTaskHour(task: Task): number {
  if (task.dueTime) {
    return parseInt(task.dueTime.split(':')[0], 10);
  }
  if (task.dueDate) {
    return new Date(task.dueDate).getHours();
  }
  return 0;
}
