import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { pushNotificationService } from '@/services/pushNotificationService';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { SubscriptionScreen } from '@/screens/subscription/SubscriptionScreen';
import { PaywallScreen } from '@/screens/subscription/PaywallScreen';
import { ComparePlansScreen } from '@/screens/subscription/ComparePlansScreen';
import { WeeklyReviewScreen } from '@/screens/reviews/WeeklyReviewScreen';
import { FocusScreen } from '@/screens/focus/FocusScreen';
import { GoalsStack } from './GoalsStack';
import { RoutinesStack } from './RoutinesStack';
import { AlarmsStack } from './AlarmsStack';
import { colors } from '@/theme/tokens';

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef();

/** Map a notification's target screen to a top-level route Planora can navigate to. */
function routeForScreen(screen: string): { name: string; params?: object } {
  switch (screen) {
    case 'Tasks':
    case 'Calendar':
    case 'Home':
    case 'Profile':
      return { name: 'Main', params: { screen } };
    case 'Goals':
    case 'Routines':
    case 'Alarms':
      return { name: screen };
    default:
      return { name: screen };
  }
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isInitialized, hasCompletedOnboarding } = useAuthStore();
  const handledRef = useRef(false);

  // Consume any pending navigation stored by a notification tap (foreground/background/cold start).
  const consumePending = useCallback(async () => {
    if (!isAuthenticated || !navigationRef.isReady()) return;
    const target = await pushNotificationService.consumePendingNavigation();
    if (!target?.screen) return;
    const route = routeForScreen(target.screen);
    try {
      navigationRef.navigate(
        route.name as never,
        (route.params ?? target.params) as never
      );
    } catch {
      /* unknown route — ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') consumePending();
    });
    return () => sub.remove();
  }, [consumePending]);

  if (!isInitialized) return null;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        if (!handledRef.current) {
          handledRef.current = true;
          consumePending();
        }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="ComparePlans"
              component={ComparePlansScreen}
              options={{ presentation: 'modal', headerShown: true, title: 'Compare plans' }}
            />
            <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Focus" component={FocusScreen} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Goals" component={GoalsStack} />
            <Stack.Screen name="Routines" component={RoutinesStack} />
            <Stack.Screen name="Alarms" component={AlarmsStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
