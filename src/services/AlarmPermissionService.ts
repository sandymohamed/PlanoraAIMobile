import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import { logger } from '@/utils/logger';

class AlarmPermissionService {
  async checkAllPermissions(): Promise<{ exactAlarm: boolean; notifications: boolean; allGranted: boolean }> {
    if (Platform.OS !== 'android') {
      return { exactAlarm: true, notifications: true, allGranted: true };
    }
    const exactAlarm = await this.checkExactAlarmPermission();
    const notifications = await this.checkNotificationPermission();
    return { exactAlarm, notifications, allGranted: exactAlarm && notifications };
  }

  async checkExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 31) return true;
    try {
      const { AlarmModule } = require('react-native').NativeModules;
      if (AlarmModule?.canScheduleExactAlarms) {
        return await AlarmModule.canScheduleExactAlarms();
      }
      return true;
    } catch (error) {
      logger.error('Exact alarm permission check failed', error);
      return false;
    }
  }

  async requestExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 31) return true;
    try {
      const { AlarmModule } = require('react-native').NativeModules;
      if (AlarmModule?.openExactAlarmSettings) {
        await AlarmModule.openExactAlarmSettings();
        return true;
      }
      Alert.alert(
        'Exact alarm permission',
        'Grant "Schedule exact alarms" in app settings for reliable alarms.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    } catch (error) {
      logger.error('Exact alarm permission request failed', error);
      return false;
    }
  }

  async checkNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 33) return true;
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } catch {
      return false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Platform.Version < 33) return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
        title: 'Notifications',
        message: 'Planora needs notifications for alarms and reminders.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  async requestAllPermissions(): Promise<boolean> {
    const perms = await this.checkAllPermissions();
    if (perms.allGranted) return true;
    if (!perms.notifications) await this.requestNotificationPermission();
    if (!perms.exactAlarm) await this.requestExactAlarmPermission();
    const final = await this.checkAllPermissions();
    if (final.allGranted || final.exactAlarm) {
      const { alarmFixService } = await import('@/services/AlarmFixService');
      await alarmFixService.onPermissionsGranted();
    }
    return final.allGranted;
  }

  async showPermissionSetupDialog(): Promise<void> {
    const perms = await this.checkAllPermissions();
    if (perms.allGranted) return;

    const missing: string[] = [];
    if (!perms.exactAlarm) missing.push('• Schedule exact alarms');
    if (!perms.notifications) missing.push('• Notifications');

    Alert.alert(
      'Alarm permissions',
      `For reliable alarms, please grant:\n\n${missing.join('\n')}`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Open settings', onPress: () => this.requestAllPermissions() },
      ]
    );
  }
}

export const alarmPermissionService = new AlarmPermissionService();
