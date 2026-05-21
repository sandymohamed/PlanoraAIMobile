import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { SubscriptionScreen } from '@/screens/subscription/SubscriptionScreen';
import { WeeklyReviewScreen } from '@/screens/reviews/WeeklyReviewScreen';
import { FocusScreen } from '@/screens/focus/FocusScreen';
import { GoalsStack } from './GoalsStack';
import { RoutinesStack } from './RoutinesStack';
import { AlarmsStack } from './AlarmsStack';
import { colors } from '@/theme/tokens';

const Stack = createNativeStackNavigator();

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

  if (!isInitialized) return null;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ presentation: 'modal' }} />
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
