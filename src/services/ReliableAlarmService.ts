import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm } from '@/types/alarm';
import { logger } from '@/utils/logger';
import { nativeAlarmBridge } from './NativeAlarmBridge';

export class ReliableAlarmService {
  private static instance: ReliableAlarmService;

  static getInstance(): ReliableAlarmService {
    if (!ReliableAlarmService.instance) {
      ReliableAlarmService.instance = new ReliableAlarmService();
    }
    return ReliableAlarmService.instance;
  }

  // Initialize - now just a placeholder for compatibility
  async initialize(): Promise<void> {
    logger.info('🔧 Initializing ReliableAlarmService (using native Android alarms)...');
    // Native alarms don't need initialization - they work via AlarmManager
  }

  // Schedule alarm using native Android AlarmManager
  async scheduleAlarm(alarm: Alarm): Promise<string> {
    const alarmId = alarm.id;
    
    logger.info(`📅 Scheduling native alarm "${alarm.title}"`);

    try {
      // Use native alarm bridge - schedules via Android AlarmManager
      await nativeAlarmBridge.scheduleAlarm(alarm);

      // Store alarm info for reference (optional, for UI purposes)
      await AsyncStorage.setItem(`alarm_${alarmId}`, JSON.stringify({
        id: alarmId,
        title: alarm.title,
        time: alarm.time,
        recurrenceRule: alarm.recurrenceRule,
        scheduledAt: Date.now(),
      }));

      logger.info('✅ Native alarm scheduled successfully');
      return alarmId;
    } catch (error) {
      logger.error('❌ Failed to schedule native alarm:', error);
      throw error;
    }
  }



  // Stop alarm - native alarms are stopped via notification actions
  // This method is kept for compatibility but doesn't play sound/vibration
  async stopAlarm(): Promise<void> {
    logger.info('🛑 Stopping alarm (stopping native service)...');
    try {
      // Stop the currently playing alarm sound/vibration
      await nativeAlarmBridge.stopPlayingAlarm();
      logger.info('✅ Native alarm service stopped');
    } catch (error) {
      logger.error('❌ Error stopping native alarm service:', error);
      // Continue with cleanup even if native stop fails
    }
    
    // Clean up storage
    await AsyncStorage.removeItem('active_alarm');
    logger.info('✅ Alarm stopped and cleaned up');
  }

  // Snooze alarm
  // NOTE: This method is deprecated - snooze is now handled via alarmStore.snoozeAlarm()
  // which uses nativeAlarmBridge.snoozeAlarm() (native Android)
  async snoozeAlarm(): Promise<void> {
    logger.warn('⚠️ ReliableAlarmService.snoozeAlarm() is deprecated - use alarmStore.snoozeAlarm() instead');
    // Snooze is now handled via alarmStore.snoozeAlarm() which uses native Android
    // This method is kept for compatibility but does nothing
    return;
    
    /* DISABLED - Use alarmStore.snoozeAlarm() instead
    logger.info('😴 Snoozing alarm...');

    // Get active alarm info
    const activeAlarmStr = await AsyncStorage.getItem('active_alarm');
    if (activeAlarmStr) {
      const activeAlarm = JSON.parse(activeAlarmStr);
      
      // Schedule for 5 minutes later using native alarm
      const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
      const snoozeAlarm: Alarm = {
        id: `${activeAlarm.id}_snooze`,
        title: `${activeAlarm.title} (Snooze)`,
        time: snoozeTime.toISOString(),
        recurrenceRule: 'none',
        enabled: true,
        userId: '',
        createdAt: '',
        updatedAt: '',
        timezone: 'UTC',
      };

      await this.scheduleAlarm(snoozeAlarm);
      logger.info('✅ Alarm snoozed for 5 minutes');
    }
    */
  }

  // Cancel scheduled alarm
  async cancelAlarm(alarmId: string): Promise<void> {
    try {
      // Cancel via native alarm bridge
      await nativeAlarmBridge.cancelAlarm(alarmId);

      // Clean up storage
      await AsyncStorage.removeItem(`alarm_${alarmId}`);
      await AsyncStorage.removeItem(`alarm_notif_${alarmId}`);
      await AsyncStorage.removeItem(`alarm_timer_${alarmId}`);

      logger.info(`✅ Alarm canceled successfully: ${alarmId}`);
      
      // Also cancel any snooze alarms for this alarm
      // Get all storage keys and find snooze alarms
      try {
        const keys = await AsyncStorage.getAllKeys();
        const snoozeKeys = keys.filter(key => 
          (key.includes(`alarm_${alarmId}_snooze_`) || 
           key.includes(`alarm_${alarmId}_snooze`)) &&
          !key.includes('_notif_') && 
          !key.includes('_timer_')
        );
        
        logger.info(`🔍 Found ${snoozeKeys.length} snooze alarm storage keys for ${alarmId}`);
        
        for (const key of snoozeKeys) {
          try {
            const alarmData = await AsyncStorage.getItem(key);
            if (alarmData) {
              const parsed = JSON.parse(alarmData);
              if (parsed.id && (parsed.id.includes('_snooze_') || parsed.id.includes('_snooze'))) {
                logger.info(`🗑️ Cancelling snooze alarm: ${parsed.id}`);
                await nativeAlarmBridge.cancelAlarm(parsed.id);
                await AsyncStorage.removeItem(key);
                // Also clean up notification and timer keys for this snooze alarm
                await AsyncStorage.removeItem(`alarm_notif_${parsed.id}`).catch(() => {});
                await AsyncStorage.removeItem(`alarm_timer_${parsed.id}`).catch(() => {});
                logger.info(`✅ Cancelled and cleaned up snooze alarm: ${parsed.id}`);
              }
            } else {
              // If no data, extract ID from key and cancel anyway
              const extractedId = key.replace('alarm_', '');
              if (extractedId && extractedId.includes('_snooze')) {
                await nativeAlarmBridge.cancelAlarm(extractedId);
                await AsyncStorage.removeItem(key);
                logger.info(`✅ Cancelled snooze alarm from key: ${extractedId}`);
              }
            }
          } catch (error) {
            logger.warn(`⚠️ Error cancelling snooze alarm from storage key ${key}:`, error);
          }
        }
      } catch (error) {
        logger.warn(`⚠️ Error checking for snooze alarms:`, error);
      }
    } catch (error) {
      logger.error('❌ Error canceling alarm:', error);
    }
  }

  // Clean up everything - cancels all scheduled alarms and clears state
  async cleanUp(): Promise<void> {
    logger.info('🧹 Cleaning up alarms...');

    try {
      // Stop any currently playing alarm first
      await this.stopAlarm();

      // Get all alarm storage keys to extract alarm IDs
      const keys = await AsyncStorage.getAllKeys();
      const alarmStorageKeys = keys.filter(key => 
        key.startsWith('alarm_') && 
        !key.includes('_notif_') && 
        !key.includes('_timer_')
      );
      
      // Try to cancel each scheduled alarm by extracting ID from storage
      const cancelPromises = alarmStorageKeys.map(async (key) => {
        try {
          const alarmData = await AsyncStorage.getItem(key);
          if (alarmData) {
            try {
              const parsed = JSON.parse(alarmData);
              if (parsed.id) {
                await this.cancelAlarm(parsed.id);
              }
            } catch {
              // If parsing fails, extract ID from key
              const alarmId = key.replace('alarm_', '');
              if (alarmId) {
                await this.cancelAlarm(alarmId);
              }
            }
          }
        } catch (error) {
          // Continue even if one alarm fails to cancel
          logger.warn(`Failed to cancel alarm from key ${key}:`, error);
        }
      });

      await Promise.allSettled(cancelPromises);

      // Clear all alarm-related storage keys
      const allAlarmKeys = keys.filter(key => 
        key.startsWith('alarm_') || 
        key.startsWith('pending_alarm') || 
        key.startsWith('active_alarm')
      );
      if (allAlarmKeys.length > 0) {
        await AsyncStorage.multiRemove(allAlarmKeys);
      }

      logger.info('✅ Alarm cleanup complete');
    } catch (error) {
      logger.error('Error during alarm cleanup:', error);
      // Don't throw - cleanup should be best effort
    }
  }
}

export const reliableAlarmService = ReliableAlarmService.getInstance();

