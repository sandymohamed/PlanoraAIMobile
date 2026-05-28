import React, { useEffect } from 'react';
import { LogBox, StatusBar } from 'react-native';

LogBox.ignoreLogs([
  'Legacy Architecture',
  'NativeEventEmitter',
]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ConfirmDialogHost } from '@/components/ConfirmDialogHost';
import { useAuthStore } from '@/store/authStore';
import { planoraTheme } from '@/theme/paperTheme';
import { initSentry, wrapApp } from '@/analytics/sentry';
import { initPostHog } from '@/analytics/posthog';
import { colors } from '@/theme/tokens';
import { reliableAlarmService } from '@/services/ReliableAlarmService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { clearAllAlarmTimerState } from '@/utils/alarmCleanup';

function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    initSentry();
    initPostHog();
    clearAllAlarmTimerState().catch(() => {});
    reliableAlarmService.initialize().catch(() => {});
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      pushNotificationService.initialize().catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={planoraTheme}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <RootNavigator />
          <ConfirmDialogHost />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapApp(App);
