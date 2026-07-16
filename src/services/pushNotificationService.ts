import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@/services/apiClient";
import { logger } from "@/utils/logger";
import { headlessNotificationHandler } from "@/services/headlessNotificationHandler";
import { processOfflineQueue } from "@/services/offlineQueue";

type NavigationTarget = {
  screen: string;
  params?: Record<string, string>;
};

/**
 * FCM token registration + notification routing when @react-native-firebase/messaging is installed.
 */
class PushNotificationService {
  private registered = false;

  async initialize(): Promise<void> {
    if (this.registered || Platform.OS === "web") return;

    headlessNotificationHandler.initialize();

    try {
      const messaging = require("@react-native-firebase/messaging").default;
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        logger.info("Push: notification permission not granted");
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
        async (remoteMessage: { data?: Record<string, string> }) => {
          const data = remoteMessage?.data ?? {};
          if (
            data.type === "TASK_REMINDER" ||
            data.type === "ROUTINE_REMINDER"
          ) {
            await AsyncStorage.setItem(
              "pending_navigation",
              JSON.stringify({
                screen: data.screen || "Tasks",
                params: data.taskId ? { taskId: data.taskId } : undefined,
              }),
            );
          }
        },
      );

      this.registered = true;
      await processOfflineQueue();
      logger.info("Push: FCM initialized");
    } catch (error) {
      await processOfflineQueue();
    }
  }

  private async registerToken(token: string): Promise<void> {
    await apiClient.post("/me/push-token", {
      token,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
    logger.info("Push token registered");
  }

  /** Consume pending navigation from notification tap (call from RootNavigator). */
  async consumePendingNavigation(): Promise<NavigationTarget | null> {
    const raw = await AsyncStorage.getItem("pending_navigation");
    if (!raw) return null;
    await AsyncStorage.removeItem("pending_navigation");
    try {
      return JSON.parse(raw) as NavigationTarget;
    } catch {
      return { screen: raw };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
