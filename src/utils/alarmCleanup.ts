import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

export async function clearAllAlarmTimerState(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(
      (key) =>
        key.startsWith('pending_') ||
        key.startsWith('active_') ||
        key.startsWith('timer_') ||
        key.startsWith('alarm_')
    );
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    logger.error('clearAllAlarmTimerState failed', error);
  }
}

export async function clearAlarmState(alarmId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      'active_alarm',
      'active_alarm_id',
      'pending_alarm_id',
      `alarm_${alarmId}`,
      `alarm_timer_${alarmId}`,
    ]);
  } catch (error) {
    logger.error('clearAlarmState failed', error);
  }
}

export async function validateAndCleanPendingState(
  alarms: Array<{ id: string }>,
  timers: Array<{ id: string }>
): Promise<void> {
  try {
    const pendingAlarmId = await AsyncStorage.getItem('pending_alarm_id');
    if (pendingAlarmId && !alarms.some((a) => a.id === pendingAlarmId)) {
      await AsyncStorage.removeItem('pending_alarm_id');
    }
    const pendingTimerId = await AsyncStorage.getItem('pending_timer_id');
    if (pendingTimerId && !timers.some((t) => t.id === pendingTimerId)) {
      await AsyncStorage.removeItem('pending_timer_id');
    }
  } catch (error) {
    logger.error('validateAndCleanPendingState failed', error);
  }
}
