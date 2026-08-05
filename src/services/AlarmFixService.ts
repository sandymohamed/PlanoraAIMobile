// PlanoraMobile/src/services/AlarmFixService.ts
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { reliableAlarmService } from '@/services/ReliableAlarmService';
import { alarmRecoveryService } from '@/services/AlarmRecoveryService';
import { alarmPermissionService } from '@/services/AlarmPermissionService';
import { nativeAlarmBridge } from '@/services/NativeAlarmBridge';
import type { Alarm } from '@/types/alarm';

/**
 * Production alarm orchestration (replaces legacy JS AlarmManager stack).
 * Scheduling is native-only via ReliableAlarmService / NativeAlarmBridge.
 */
class AlarmFixService {
  private static instance: AlarmFixService;
  private initialized = false;

  static getInstance(): AlarmFixService {
    if (!AlarmFixService.instance) {
      AlarmFixService.instance = new AlarmFixService();
    }
    return AlarmFixService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (Platform.OS !== 'android') return;

    try {
      await reliableAlarmService.initialize();
      await alarmPermissionService.requestAllPermissions();
      await alarmRecoveryService.runRecovery('app_start');
      logger.info('AlarmFixService initialized');
    } catch (error) {
      logger.error('AlarmFixService init failed (non-fatal):', error);
    }
  }

  /** Reschedule after user grants exact-alarm permission. */
  async onPermissionsGranted(): Promise<void> {
    await alarmRecoveryService.runRecovery('permission_granted');
  }

  /** Schedule via native bridge (throws on failure). */
  async scheduleAlarm(alarm: Alarm): Promise<void> {
    const { useAlarmStore } = await import('@/store/alarmStore');
    await useAlarmStore.getState().scheduleAlarmNative(alarm);
  }

  async cancelAlarm(alarmId: string): Promise<void> {
    await reliableAlarmService.cancelAlarm(alarmId);
  }

  async cleanUp(): Promise<void> {
    await reliableAlarmService.cleanUp();
  }

  async verifyExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const can = await nativeAlarmBridge.canScheduleExactAlarms();
    if (!can) {
      await nativeAlarmBridge.openExactAlarmSettings();
    }
    return can;
  }
}

export const alarmFixService = AlarmFixService.getInstance();
