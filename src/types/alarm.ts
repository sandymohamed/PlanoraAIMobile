export interface Alarm {
  id: string;
  title: string;
  time: string; // ISO string
  timezone: string;
  recurrenceRule?: string;
  toneUrl?: string;
  smartWakeWindow?: number;
  linkedTaskId?: string;
  enabled: boolean;
  snoozeConfig?: SnoozeConfig;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateAlarmData {
  title: string;
  time: string; // ISO string
  timezone?: string;
  recurrenceRule?: string;
  toneUrl?: string;
  smartWakeWindow?: number;
  linkedTaskId?: string;
  enabled?: boolean;
  snoozeConfig?: SnoozeConfig;
}

export interface UpdateAlarmData {
  title?: string;
  time?: string; // ISO string
  timezone?: string;
  recurrenceRule?: string;
  toneUrl?: string;
  smartWakeWindow?: number;
  linkedTaskId?: string;
  enabled?: boolean;
  snoozeConfig?: SnoozeConfig;
}

export interface SnoozeConfig {
  duration: number; // minutes
  maxSnoozes: number;
  snoozeCount?: number;
}

export interface Timer {
  id: string;
  title: string;
  duration: number; // minutes
  remainingTime: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface CreateTimerData {
  title: string;
  duration: number; // minutes
}

export interface UpdateTimerData {
  title?: string;
  duration?: number;
  isRunning?: boolean;
  isPaused?: boolean;
  remainingTime?: number;
}

export interface TimerSession {
  id: string;
  timerId: string;
  startTime: string;
  endTime?: string;
  duration: number; // actual duration in seconds
  isCompleted: boolean;
  createdAt: string;
  userId: string;
}
