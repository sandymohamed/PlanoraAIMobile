import { useState, useCallback } from 'react';
import type { TaskFormValues } from '@/components/tasks/TaskForm';

function toDueTime(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function useTaskDueDate(initial?: { dueDate?: string; dueTime?: string }) {
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(
    initial?.dueDate ? new Date(initial.dueDate) : null
  );
  const [hasTime, setHasTime] = useState(!!initial?.dueTime);

  const applyDueDateTime = useCallback((date: Date | null, withTime = hasTime): Partial<TaskFormValues> => {
    setSelectedDateTime(date);
    if (!date) {
      setHasTime(false);
      return { dueDate: undefined, dueTime: undefined };
    }
    return {
      dueDate: date.toISOString(),
      dueTime: withTime ? toDueTime(date) : undefined,
    };
  }, [hasTime]);

  const clearDue = useCallback((): Partial<TaskFormValues> => {
    setHasTime(false);
    setSelectedDateTime(null);
    return { dueDate: undefined, dueTime: undefined };
  }, []);

  const toggleHasTime = useCallback((v: boolean, values: TaskFormValues): Partial<TaskFormValues> => {
    setHasTime(v);
    if (!v) return { dueTime: undefined };
    const date = selectedDateTime || (values.dueDate ? new Date(values.dueDate) : null);
    if (!date) return {};
    return {
      dueDate: date.toISOString(),
      dueTime: toDueTime(date),
    };
  }, [selectedDateTime]);

  const syncFromValues = useCallback((values: Pick<TaskFormValues, 'dueDate' | 'dueTime'>) => {
    setSelectedDateTime(values.dueDate ? new Date(values.dueDate) : null);
    setHasTime(!!values.dueTime);
  }, []);

  return {
    selectedDateTime,
    hasTime,
    setHasTime,
    applyDueDateTime,
    clearDue,
    toggleHasTime,
    syncFromValues,
  };
}

export function validateTaskForm(values: TaskFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  if (values.dueDate) {
    const due = new Date(values.dueDate);
    if (due.getTime() < Date.now() - 60_000) errors.dueDate = 'Due date cannot be in the past';
  }
  return errors;
}
