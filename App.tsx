import React, { useEffect, useState } from "react";
import "@/i18n";

import {
  AppState,
  AppStateStatus,
  InteractionManager,
  LogBox,
  StatusBar,
  Text,
  NativeEventEmitter,
  NativeModules,
} from "react-native";
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
  const [activeAlarm, setActiveAlarm] = useState<{
    alarmId: string;
    title: string;
  } | null>(null);

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

useEffect(() => {
  const { AlarmModule } = NativeModules;

  if (!AlarmModule) {
    console.warn("AlarmModule is not available");
    return;
  }

  const eventEmitter = new NativeEventEmitter(AlarmModule);

  const firedSubscription = eventEmitter.addListener(
    "AlarmFired",
    (event: { alarmId: string; title: string }) => {
      console.log("🔔 AlarmFired received:", event);

      setActiveAlarm({
        alarmId: event.alarmId,
        title: event.title,
      });
    },
  );

  const stopSubscription = eventEmitter.addListener(
    "AlarmStop",
    (event: { alarmId: string }) => {
      console.log("🛑 AlarmStop received:", event);

      setActiveAlarm(null);
    },
  );

  const snoozeSubscription = eventEmitter.addListener(
    "AlarmSnooze",
    (event: { alarmId: string }) => {
      console.log("😴 AlarmSnooze received:", event);

      setActiveAlarm(null);
    },
  );

  return () => {
    firedSubscription.remove();
    stopSubscription.remove();
    snoozeSubscription.remove();
  };
}, []);

  useEffect(() => {
    const checkActiveAlarm = async () => {
      try {
        const { AlarmModule } = NativeModules;

        if (!AlarmModule?.getActiveAlarm) {
          console.warn("AlarmModule.getActiveAlarm is not available");
          return;
        }

        const alarm = await AlarmModule.getActiveAlarm();

        console.log("🔎 Active native alarm:", alarm);

        if (alarm?.isRinging && alarm.alarmId) {
          setActiveAlarm({
            alarmId: alarm.alarmId,
            title: alarm.title || "Alarm",
          });
        } else {
          setActiveAlarm(null);
        }
      } catch (error) {
        console.error("Failed to check active alarm:", error);
      }
    };

    checkActiveAlarm();

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          checkActiveAlarm();
        }
      },
    );

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={planoraTheme}>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
          />

          {activeAlarm && (
  <ActiveAlarmBanner
    alarm={activeAlarm}
    onStop={async () => {
      try {
        await reliableAlarmService.stopAlarm();
        
        setActiveAlarm(null);
      } catch (error) {
        console.error("Failed to stop alarm:", error);
      }
    }}
    onSnooze={async () => {
      try {
        const { useAlarmStore } = await import("@/store/alarmStore");

        await useAlarmStore
          .getState()
          .snoozeAlarm(activeAlarm.alarmId, 5);

        setActiveAlarm(null);
      } catch (error) {
        console.error("Failed to snooze alarm:", error);
      }
    }}
    onPress={() => {
      // Navigation can be added here later.
      console.log("Opening alarm:", activeAlarm.alarmId);
    }}
  />
)}

          <RootNavigator />
          <ConfirmDialogHost />
          <ActionSheetHost />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapApp(App);
