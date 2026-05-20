import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAuthStore } from '@/store/authStore';
import { planoraTheme } from '@/theme/paperTheme';
import { initSentry, wrapApp } from '@/analytics/sentry';
import { initPostHog } from '@/analytics/posthog';
import { colors } from '@/theme/tokens';

function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initSentry();
    initPostHog();
    initializeAuth();
  }, [initializeAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={planoraTheme}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <RootNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapApp(App);
