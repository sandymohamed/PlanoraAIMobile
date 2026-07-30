//src/services/headlessNotification
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

type RemotePayload = Record<string, string | undefined>;

/**
 * Handles FCM data messages when app is backgrounded/killed (no react-native-push-notification).
 * Native AlarmManager still rings user alarms; this stores pending state for task/routine reminders.
 */
class HeadlessNotificationHandler {
  private registered = false;

  initialize(): void {
    if (this.registered || Platform.OS !== 'android') return;

    try {
      const messaging = require('@react-native-firebase/messaging').default;

      messaging().setBackgroundMessageHandler(async (remoteMessage: { data?: RemotePayload }) => {
        await this.handlePayload(remoteMessage?.data ?? {}, 'background');
      });

      messaging().onNotificationOpenedApp((remoteMessage: { data?: RemotePayload }) => {
        this.handlePayload(remoteMessage?.data ?? {}, 'opened').catch(() => {});
      });

      messaging()
        .getInitialNotification()
        .then((remoteMessage: { data?: RemotePayload } | null) => {
          if (remoteMessage?.data) {
            this.handlePayload(remoteMessage.data, 'initial').catch(() => {});
          }
        })
        .catch(() => {});

      this.registered = true;
      logger.info('HeadlessNotificationHandler: FCM handlers registered');
    } catch (error) {

      logger.error('HeadlessNotificationHandler: FCM not installed',error);
    }
  }

  private async handlePayload(data: RemotePayload, source: string): Promise<void> {
    const type = data.type || data.notificationType;
    const targetId = data.alarmId || data.targetId || data.taskId || data.routineId;

    logger.info('Headless notification', { type, targetId, source });

    if (
      type === 'ALARM_TRIGGER' ||
      type === 'TASK_REMINDER' ||
      type === 'DUE_DATE_REMINDER' ||
      type === 'ROUTINE_REMINDER'
    ) {
      if (targetId) {
        await AsyncStorage.setItem('pending_alarm_id', targetId);
      }
      if (data.screen) {
        await AsyncStorage.setItem('pending_navigation', data.screen);
      }
    }

    if (type === 'TIMER_COMPLETE' && data.timerId) {
      await AsyncStorage.setItem('pending_timer_id', data.timerId);
    }
  }
}

export const headlessNotificationHandler = new HeadlessNotificationHandler();
