// src/services/AlarmPermissionService
import { Platform, PermissionsAndroid, Linking } from "react-native";
import { logger } from "@/utils/logger";
import { showConfirmDialog } from "@/components/ConfirmationDialog";

class AlarmPermissionService {
  async checkAllPermissions(): Promise<{
    exactAlarm: boolean;
    notifications: boolean;
    allGranted: boolean;
  }> {
    if (Platform.OS !== "android") {
      return { exactAlarm: true, notifications: true, allGranted: true };
    }
    const exactAlarm = await this.checkExactAlarmPermission();
    const notifications = await this.checkNotificationPermission();
    return {
      exactAlarm,
      notifications,
      allGranted: exactAlarm && notifications,
    };
  }

  async checkExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== "android" || Platform.Version < 31) return true;
    try {
      const { AlarmModule } = require("react-native").NativeModules;
      if (AlarmModule?.canScheduleExactAlarms) {
        return await AlarmModule.canScheduleExactAlarms();
      }
      return true;
    } catch (error) {
      logger.error("Exact alarm permission check failed", error);
      return false;
    }
  }

  async requestExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== "android" || Platform.Version < 31) return true;
    try {
      const { AlarmModule } = require("react-native").NativeModules;
      if (AlarmModule?.openExactAlarmSettings) {
        await AlarmModule.openExactAlarmSettings();
        return true;
      }

      showConfirmDialog({
        title: "Exact alarm permission",
        message:
          'Grant "Schedule exact alarms" in app settings for reliable alarms.',
        confirmLabel: "Open Settings",
        cancelLabel: "Cancel",
        variant: "warning",
        onConfirm: () => Linking.openSettings(),
      });
      return false;
    } catch (error) {
      logger.error("Exact alarm permission request failed", error);
      return false;
    }
  }

  // async checkNotificationPermission(): Promise<boolean> {
  //   if (Platform.OS !== "android") return true;

  //   try {
  //     const messaging = require("@react-native-firebase/messaging").default;

  //     const status = await messaging().hasPermission();

  //     return (
  //       status === messaging.AuthorizationStatus.AUTHORIZED ||
  //       status === messaging.AuthorizationStatus.PROVISIONAL
  //     );
  //   } catch (e) {
  //     logger.error("Notification permission check failed", e);
  //     return false;
  //   }
  // }

  async checkNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== "android") {
      return true;
    }

    try {
      // Android 13+
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        return granted;
      }


      return true;
    } catch (error) {
      logger.error("Notification permission check failed", error);
      return false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    if (Platform.Version < 33) {
      showConfirmDialog({
        title: "Notifications are disabled",
        message:
          "Please enable notifications manually from your device settings so alarms can display Stop and Snooze buttons.",
        confirmLabel: "Open Settings",
        cancelLabel: "Later",
        onConfirm: () => Linking.openSettings(),
      });

      return false;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notifications",
          message: "Planora needs notifications for alarms and reminders.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      await Linking.openSettings();
      return false;
      // return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
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
      const { alarmFixService } = await import("@/services/AlarmFixService");
      await alarmFixService.onPermissionsGranted();
    }
    return final.allGranted;
  }

  async showPermissionSetupDialog(): Promise<void> {
    const perms = await this.checkAllPermissions();
    if (perms.allGranted) return;

    const missing: string[] = [];
    if (!perms.exactAlarm) missing.push("• Schedule exact alarms");
    if (!perms.notifications) missing.push("• Notifications");

    showConfirmDialog({
      title: "Planora needs permission",
      message: `For reliable alarms, please grant:\n\n${missing.join("\n")}`,
      confirmLabel: "Open settings",
      cancelLabel: "Later",
      variant: "warning",
      onConfirm: async () => {
        await this.requestAllPermissions();
      },
    });
  }
}

export const alarmPermissionService = new AlarmPermissionService();
