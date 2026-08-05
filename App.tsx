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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={planoraTheme}>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
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
