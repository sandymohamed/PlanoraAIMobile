import { Platform } from 'react-native';
import { apiClient } from '@/services/apiClient';
import { logger } from '@/utils/logger';

/**
 * Registers FCM device token with backend when @react-native-firebase/messaging is installed.
 * Safe no-op when Firebase is not configured in the build.
 */
class PushNotificationService {
  private registered = false;

  async initialize(): Promise<void> {
    if (this.registered || Platform.OS === 'web') return;

    try {
      // Optional dependency — not required for native AlarmManager alarms
      const messaging = require('@react-native-firebase/messaging').default;
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        logger.info('Push: notification permission not granted');
        return;
      }

      const token = await messaging().getToken();
      if (!token) return;

      await apiClient.post('/me/push-token', {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      messaging().onTokenRefresh(async (newToken: string) => {
        await apiClient.post('/me/push-token', {
          token: newToken,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
      });

      this.registered = true;
      logger.info('Push token registered with backend');
    } catch {
      logger.debug('Push notifications unavailable (install @react-native-firebase/messaging for FCM)');
    }
  }
}

export const pushNotificationService = new PushNotificationService();
