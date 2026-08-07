import React, { useEffect, useState } from "react";
import { InteractionManager, LogBox, StatusBar, Text } from "react-native";
import "@/i18n";

import { AppState, AppStateStatus } from "react-native";
import { alarmPermissionService } from "@/services/AlarmPermissionService";
LogBox.ignoreLogs(["Legacy Architecture", "NativeEventEmitter"]);
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { RootNavigator } from "@/navigation/RootNavigator";
import { ConfirmDialogHost } from "@/components/ConfirmDialogHost";
import { ActionSheetHost } from "@/components/ActionSheetHost";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { planoraTheme } from "@/theme/paperTheme";
import { initSentry, wrapApp } from "@/analytics/sentry";
import { initPostHog } from "@/analytics/posthog";
import { colors } from "@/theme/tokens";
import { initializeRemoteConfig } from "@/config/remoteConfig";
import { logger } from "@/utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActiveAlarmBanner } from "@/components/ActiveAlarmBanner";
import { reliableAlarmService } from "@/services/ReliableAlarmService";

function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await initializeRemoteConfig();
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    initSentry();
    const startupTask = InteractionManager.runAfterInteractions(() => {
      initPostHog();
      import("@/utils/alarmCleanup")
        .then(({ clearAllAlarmTimerState }) => clearAllAlarmTimerState())
        .catch(() => {});
      import("@/services/AlarmFixService")
        .then(({ alarmFixService }) => alarmFixService.initialize())
        .catch(() => {});
    });

    initializeAuth()
      .then(() => import("@/services/offlineQueue"))
      .then(({ processOfflineQueue }) => processOfflineQueue())
      .catch(() => {});

    return () => startupTask.cancel();
  }, [initializeAuth]);

  useEffect(() => {
    logger.info("App: user is authenticated, initializing services...", {
      isAuthenticated,
    });
    if (isAuthenticated) {
      logger.info("App: user is authenticated, initializing services...", {
        isAuthenticated,
      });
      import("@/services/pushNotificationService")
        .then(({ pushNotificationService }) =>
          pushNotificationService.initialize(),
        )
        .catch((err) => {
          logger.error(`PushNotificationService init failed: ${err}`);
        })
        .finally(() => {
          logger.info("PushNotificationService init completed");
        });

      import("@/services/offlineQueue")
        .then(({ processOfflineQueue }) => processOfflineQueue())
        .catch((err) => {
          logger.error(`Offline queue processing failed: ${err}`);
        });
      useSubscriptionStore
        .getState()
        .fetchAIUsage()
        .catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPermissions = () => {
      alarmPermissionService.showPermissionSetupDialog().catch(() => {});
    };

    // Every app launch
    checkPermissions();

    // Every resume
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkPermissions();
      }
    });

    return () => sub.remove();
  }, [isAuthenticated]);

  const [activeAlarm, setActiveAlarm] = useState<any>(null);
  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadActiveAlarm = async () => {
      try {
        const [alarmStr, alarmIdStr] = await Promise.all([
          AsyncStorage.getItem("active_alarm"),
          AsyncStorage.getItem("active_alarm_id"),
        ]);

        console.log("Active alarm raw:", alarmStr);
        console.log("Active alarm ID:", alarmIdStr);

        if (!mounted) return;

        if (alarmStr && alarmStr !== "undefined" && alarmStr !== "null") {
          try {
            const parsed = JSON.parse(alarmStr);

            setActiveAlarm(parsed);
            setActiveAlarmId(alarmIdStr);

            console.log("Active alarm parsed:", parsed);
          } catch (error) {
            logger.error("Failed to parse active alarm", error);
            setActiveAlarm(null);
          }
        } else {
          setActiveAlarm(null);
          setActiveAlarmId(null);
        }
      } catch (error) {
        logger.error("Failed to load active alarm", error);
      }
    };

    loadActiveAlarm();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadActiveAlarm();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };

  }, [activeAlarmId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={planoraTheme}>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
          />
          <ActiveAlarmBanner
            alarm={activeAlarm}
            alarmId={activeAlarmId}
            onStop={async () => {
              if (!activeAlarmId) return;

              await reliableAlarmService.stopAlarm();

              setActiveAlarm(null);
              setActiveAlarmId(null);
            }}
            onSnooze={async () => {
              if (!activeAlarmId) return;

              // Eventually use your alarmStore.snoozeAlarm()
              console.log("Snooze:", activeAlarmId);
            }}
            onPress={() => {
              // Navigate to Alarms screen later
            }}
          />
          <RootNavigator />
          <ConfirmDialogHost />
          <ActionSheetHost />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapApp(App);
