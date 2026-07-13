import React, { useEffect } from 'react';
import { InteractionManager, LogBox, StatusBar } from 'react-native';
import '@/i18n';

LogBox.ignoreLogs([
  'Legacy Architecture',
  'NativeEventEmitter',
]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ConfirmDialogHost } from '@/components/ConfirmDialogHost';
import { ActionSheetHost } from '@/components/ActionSheetHost';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { planoraTheme } from '@/theme/paperTheme';
import { initSentry, wrapApp } from '@/analytics/sentry';
import { initPostHog } from '@/analytics/posthog';
import { colors } from '@/theme/tokens';
import { appSync } from '@/services/sync/appSync';

function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    initSentry();
    
    const startupTask = InteractionManager.runAfterInteractions(async () => {
      initPostHog();
      
      // Cleanup alarms
      try {
        const { clearAllAlarmTimerState } = await import('@/utils/alarmCleanup');
        clearAllAlarmTimerState();
      } catch (e) {}
      
      try {
        const { alarmFixService } = await import('@/services/AlarmFixService');
        alarmFixService.initialize();
      } catch (e) {}

      // Initialize auth
      await initializeAuth();
      
      // Initialize sync service (this will restore cached data and refresh if needed)
      await appSync.initialize();
      
      // Process offline queue
      try {
        const { processOfflineQueue } = await import('@/services/offlineQueue');
        processOfflineQueue();
      } catch (e) {}
    });

    return () => startupTask.cancel();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      // Initialize push notifications
      import('@/services/pushNotificationService')
        .then(({ pushNotificationService }) => pushNotificationService.initialize())
        .catch(() => {});
      
      // Fetch subscription data (non-critical)
      useSubscriptionStore.getState().fetchAIUsage().catch(() => {});
    }
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={planoraTheme}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <RootNavigator />
          <ConfirmDialogHost />
          <ActionSheetHost />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapApp(App);