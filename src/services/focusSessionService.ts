import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Alarm } from '@/types/alarm';
import { logger } from '@/utils/logger';
import { reliableAlarmService } from '@/services/ReliableAlarmService';
import { alarmPermissionService } from '@/services/AlarmPermissionService';

export type FocusMode = 'pomodoro' | 'deep';

export const FOCUS_MODES: Record<FocusMode, { label: string; minutes: number; tagline: string }> = {
  pomodoro: { label: 'Pomodoro', minutes: 25, tagline: 'Classic 25-minute focus block' },
  deep: { label: 'Deep work', minutes: 90, tagline: 'Long, uninterrupted deep session' },
};

const SESSION_KEY = '@planora_focus_session';
const STATS_KEY = '@planora_focus_stats';
const FOCUS_ALARM_ID = 'focus_timer';

export type FocusSession = {
  mode: FocusMode;
  durationSec: number;
  status: 'running' | 'paused';
  /** epoch ms at which the session ends (only meaningful while running) */
  endsAt: number | null;
  /** seconds remaining captured at pause */
  remainingSec: number;
  startedAt: number;
};

export type FocusStats = {
  date: string; // YYYY-MM-DD
  completed: number;
  focusedSeconds: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadSession(): Promise<FocusSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as FocusSession) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: FocusSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  await cancelFocusAlarm();
}

export async function loadStats(): Promise<FocusStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FocusStats;
      if (parsed.date === todayKey()) return parsed;
    }
  } catch {
    // ignore
  }
  return { date: todayKey(), completed: 0, focusedSeconds: 0 };
}

export async function recordCompletedSession(focusedSeconds: number): Promise<FocusStats> {
  const stats = await loadStats();
  const next: FocusStats = {
    date: todayKey(),
    completed: stats.completed + 1,
    focusedSeconds: stats.focusedSeconds + focusedSeconds,
  };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
  return next;
}

function buildFocusAlarm(endsAt: number, label: string): Alarm {
  const nowIso = new Date().toISOString();
  return {
    id: FOCUS_ALARM_ID,
    title: label,
    time: new Date(endsAt).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrenceRule: undefined,
    enabled: true,
    userId: 'local',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Schedules a native AlarmManager alarm so the session rings even when the
 * screen is off, the user navigates away, or the app is killed.
 */
export async function scheduleFocusAlarm(endsAt: number, label: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await alarmPermissionService.requestAllPermissions();
    await reliableAlarmService.cancelAlarm(FOCUS_ALARM_ID).catch(() => {});
    await reliableAlarmService.scheduleAlarm(buildFocusAlarm(endsAt, label));
    logger.info('Focus alarm scheduled', { endsAt });
  } catch (error) {
    logger.error('Failed to schedule focus alarm:', error);
    throw error;
  }
}

export async function cancelFocusAlarm(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await reliableAlarmService.cancelAlarm(FOCUS_ALARM_ID).catch(() => {});
}

/**
 * Stops the alarm that is currently ringing (sound + vibration + notification)
 * and clears the scheduled focus alarm. Lets the user dismiss from inside the app.
 */
export async function stopFocusAlarmSound(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await reliableAlarmService.stopAlarm();
  } catch (error) {
    logger.warn('Failed to stop focus alarm sound:', error);
  }
  await cancelFocusAlarm();
}

/** Remaining seconds for a running/paused session, clamped at 0. */
export function computeRemaining(session: FocusSession, now = Date.now()): number {
  if (session.status === 'paused') return Math.max(0, Math.round(session.remainingSec));
  if (session.endsAt == null) return 0;
  return Math.max(0, Math.round((session.endsAt - now) / 1000));
}
