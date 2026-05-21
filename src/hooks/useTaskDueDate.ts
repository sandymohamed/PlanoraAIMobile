import { useState, useCallback } from 'react';
import type { TaskFormValues } from '@/components/tasks/TaskForm';

export function useTaskDueDate(initial?: { dueDate?: string; dueTime?: string }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(initial?.dueDate || Date.now()));
  const [selectedTime, setSelectedTime] = useState(() => {
    if (initial?.dueTime) {
      const [h, m] = initial.dueTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    return new Date();
  });
  const [hasTime, setHasTime] = useState(!!initial?.dueTime);

  const applyDate = useCallback((date: Date | undefined, values: TaskFormValues): Partial<TaskFormValues> => {
    if (!date) return {};
    setSelectedDate(date);
    let combined = new Date(date);
    if (hasTime && values.dueTime) {
      const [h, m] = values.dueTime.split(':').map(Number);
      combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
    } else {
      combined = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    return { dueDate: combined.toISOString() };
  }, [hasTime]);

  const applyTime = useCallback((time: Date | undefined, values: TaskFormValues): Partial<TaskFormValues> => {
    if (!time) return {};
    setSelectedTime(time);
    const dueTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    let dueDate = values.dueDate;
    if (values.dueDate) {
      const base = new Date(values.dueDate);
      const combined = new Date(base.getFullYear(), base.getMonth(), base.getDate(), time.getHours(), time.getMinutes());
      dueDate = combined.toISOString();
    }
    return { dueTime, dueDate };
  }, []);

  const clearDue = useCallback((): Partial<TaskFormValues> => {
    setHasTime(false);
    return { dueDate: undefined, dueTime: undefined };
  }, []);

  const toggleHasTime = useCallback((v: boolean, values: TaskFormValues): Partial<TaskFormValues> => {
    setHasTime(v);
    if (!v) return { dueTime: undefined };
    if (!values.dueDate) return {};
    return applyTime(selectedTime, values);
  }, [applyTime, selectedTime]);

  return {
    showDatePicker,
    showTimePicker,
    selectedDate,
    selectedTime,
    hasTime,
    setShowDatePicker,
    setShowTimePicker,
    setHasTime,
    applyDate,
    applyTime,
    clearDue,
    toggleHasTime,
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
