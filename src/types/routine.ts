export interface RoutineSchedule {
  time?: string; // "05:00"
  days?: number[]; // [1,2,3,4,5] for days of week
  day?: number; // for monthly: day of month
}

export type RoutineFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description?: string;
  frequency: RoutineFrequency;
  schedule: RoutineSchedule;
  timezone: string;
  enabled: boolean;
  reminderBefore?: string; // e.g., "2h" for hours, "2d" for days, "1w" for weeks
  lastResetAt?: string;
  nextOccurrenceAt?: string;
  createdAt: string;
  updatedAt: string;
  routineTasks: RoutineTask[];
}

export interface RoutineTask {
  id: string;
  routineId: string;
  title: string;
  description?: string;
  order: number;
  completed: boolean;
  completedAt?: string;
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutineData {
  title: string;
  description?: string;
  frequency: RoutineFrequency;
  schedule: RoutineSchedule;
  timezone?: string;
  reminderBefore?: string; // e.g., "2h" for hours, "2d" for days, "1w" for weeks
}

export interface UpdateRoutineData extends Partial<CreateRoutineData> {
  enabled?: boolean;
}

export interface CreateRoutineTaskData {
  title: string;
  description?: string;
  order?: number;
  reminderTime?: string;
}

export interface UpdateRoutineTaskData extends Partial<CreateRoutineTaskData> {}

