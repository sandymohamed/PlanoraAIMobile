//PlanoraMobile/src/services/pushNotificationService
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@/services/apiClient";
import { logger } from "@/utils/logger";
import { headlessNotificationHandler } from "@/services/headlessNotificationHandler";
import { processOfflineQueue } from "@/services/offlineQueue";
import { Alert } from "react-native";
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";

type NavigationTarget = {
  screen: string;
  params?: Record<string, string>;
};

/**
 * FCM token registration + notification routing when @react-native-firebase/messaging is installed.
 */
class PushNotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized || Platform.OS === "web") return;

    headlessNotificationHandler.initialize();

    try {
      const messaging = require("@react-native-firebase/messaging").default;
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log("Push: notification permission not granted");
        return;
      }

      const token = await messaging().getToken();
      if (token) {
        await this.registerToken(token);
      }

      messaging().onTokenRefresh(async (newToken: string) => {
        await this.registerToken(newToken);
      });

      messaging().onMessage(
        async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
          await notifee.displayNotification({
            title: remoteMessage.notification?.title ?? "Planora AI",
            body: remoteMessage.notification?.body ?? "",

            data: remoteMessage.data,

            android: {
              channelId: "alarm_channel",
              smallIcon: "ic_launcher",
              pressAction: {
                id: "default",
              },
            },
          });

          const data = remoteMessage.data ?? {};

          if (
            data.type === "TASK_REMINDER" ||
            data.type === "ROUTINE_REMINDER"
          ) {
            await AsyncStorage.setItem(
              "pending_navigation",
              JSON.stringify({
                screen: data.screen || "Tasks",
                params: data.taskId
                  ? { taskId: data.taskId }
                  : { taskId: data.targetId },
              }),
            );
          }
        },
      );

      this.initialized = true;
      await processOfflineQueue();
    } catch (error) {
      await processOfflineQueue();
    }
  }

  private async registerToken(token: string): Promise<void> {
    await apiClient.post("/me/push-token", {
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  }

  async deleteToken(): Promise<void> {
    if (Platform.OS === "web") return;

    try {
      const messaging = require("@react-native-firebase/messaging").default;

      const token = await messaging().getToken();

      if (!token) {
        console.log("Push: no FCM token to unregister");
        return;
      }

      await apiClient.delete("/me/push-token", {
        data: { token },
        skipAuthRetry: true,
      });

      await messaging().deleteToken();

      this.initialized = false;
      console.log("Push token removed from backend");
    } catch (error) {
      logger.warn("Failed to unregister push token", error);
    }
  }

  /** Consume pending navigation from notification tap (call from RootNavigator). */
  async consumePendingNavigation(): Promise<NavigationTarget | null> {
    const raw = await AsyncStorage.getItem("pending_navigation");

    if (!raw) return null;
    await AsyncStorage.removeItem("pending_navigation");

    try {
      return JSON.parse(raw) as NavigationTarget;
    } catch (err) {
      logger.error(
        "PushNotificationService: failed to parse pending navigation",
        { err },
      );
      return { screen: raw };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
