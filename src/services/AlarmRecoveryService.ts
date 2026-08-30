import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { nativeAlarmBridge } from '@/services/NativeAlarmBridge';
import { alarmPermissionService } from '@/services/AlarmPermissionService';
import { useAuthStore } from '@/store/authStore';

const APP_BUILD_KEY = '@planora_last_known_build';
const RECOVERY_LOCK_KEY = '@planora_alarm_recovery_lock';
const BUILD_VERSION = '1.0.4'; // Keep in sync with package.json for update detection

export type RecoveryReason = 'app_start' | 'boot' | 'app_update' | 'permission_granted' | 'authenticated';

/**
 * Post-boot / post-update / cold-start alarm recovery.
 * Native AlarmManager is source of truth; this reschedules from backend when needed.
 */
class AlarmRecoveryService {
  private running = false;

  async runRecovery(reason: RecoveryReason): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (this.running) return;

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated && reason !== 'permission_granted') {
      return;
    }

    this.running = true;
    try {
      const lock = await AsyncStorage.getItem(RECOVERY_LOCK_KEY);
      const lockAge = lock ? Date.now() - Number(lock) : Infinity;
      if (lockAge < 5000 && reason === 'app_start') {
        logger.debug('Alarm recovery skipped (debounced)');
        return;
      }
      await AsyncStorage.setItem(RECOVERY_LOCK_KEY, String(Date.now()));

      const needsBootReschedule = await nativeAlarmBridge.getAndClearNeedsReschedule();
      const appUpdated = await this.detectAppUpdate();

      if (needsBootReschedule) {
        logger.info('Alarm recovery: device reboot detected');
      }
      if (appUpdated) {
        logger.info('Alarm recovery: app version/build changed');
      }

      const shouldReschedule =
        needsBootReschedule ||
        appUpdated ||
        reason === 'boot' ||
        reason === 'app_update' ||
        reason === 'permission_granted';

      if (shouldReschedule) {
        await alarmPermissionService.requestAllPermissions();
        const { useAlarmStore } = await import('@/store/alarmStore');
        await useAlarmStore.getState().fetchAlarms(1, 100, undefined);
        logger.info('Alarm recovery: alarms rescheduled', { reason });
      }

      await this.recoverPendingSnooze();
    } catch (error) {
      logger.error('Alarm recovery failed (non-fatal):', error);
    } finally {
      this.running = false;
    }
  }

  private async detectAppUpdate(): Promise<boolean> {
    const previous = await AsyncStorage.getItem(APP_BUILD_KEY);
    if (previous !== BUILD_VERSION) {
      await AsyncStorage.setItem(APP_BUILD_KEY, BUILD_VERSION);
      return previous != null;
    }
    return false;
  }

  private async recoverPendingSnooze(): Promise<void> {
    const pending = await AsyncStorage.getItem('pending_snooze_alarm_id');
    if (!pending) return;
    const originalId = pending.replace(/_snooze_\d+$/, '').replace(/_snooze$/, '');
    try {
      const { useAlarmStore } = await import('@/store/alarmStore');
      await useAlarmStore.getState().snoozeAlarm(originalId, 5);
      await AsyncStorage.removeItem('pending_snooze_alarm_id');
      logger.info('Alarm recovery: applied pending snooze', { originalId });
    } catch (e) {
      logger.warn('Alarm recovery: pending snooze failed', e);
    }
  }
}

export const alarmRecoveryService = new AlarmRecoveryService();
