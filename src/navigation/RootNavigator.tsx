// src/navigation/RootNavigator.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useTranslation } from "react-i18next";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  createNavigationContainerRef,
  ParamListBase,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@/store/authStore";
import { pushNotificationService } from "@/services/pushNotificationService";
import { OnboardingScreen } from "@/screens/onboarding/OnboardingScreen";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabs } from "./MainTabs";
import { SubscriptionScreen } from "@/screens/subscription/SubscriptionScreen";
import { PaywallScreen } from "@/screens/subscription/PaywallScreen";
import { ComparePlansScreen } from "@/screens/subscription/ComparePlansScreen";
import { WeeklyReviewScreen } from "@/screens/reviews/WeeklyReviewScreen";
import { FocusScreen } from "@/screens/focus/FocusScreen";
import { AnimatedSplashScreen } from "@/screens/splash/AnimatedSplashScreen";
import { GoalsStack } from "./GoalsStack";
import { RoutinesStack } from "./RoutinesStack";
import { AlarmsStack } from "./AlarmsStack";
import { logger } from "@/utils/logger";
import { usePlanoraTheme } from "@/theme/ThemeProvider";
import { hasSeenFirstLoginSetup } from "@/services/firstLoginSetupStorage";
import { FirstLoginSetupNavigator } from "./FirstLoginSetupNavigator";

const Stack = createNativeStackNavigator();

export const navigationRef = createNavigationContainerRef<ParamListBase>();

/** Map a notification's target screen to a top-level route Planora can navigate to. */
function routeForScreen(screen: string): { name: string; params?: object } {
  switch (screen) {
    case "Tasks":
    case "Calendar":
    case "Home":
    case "Profile":
      return { name: "Main", params: { screen } };
    case "Goals":
    case "Routines":
    case "Alarms":
      return { name: screen };
    default:
      return { name: screen };
  }
}

export const RootNavigator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = usePlanoraTheme();
  const user = useAuthStore((s) => s.user);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const handledRef = useRef(false);
  const [showSplash, setShowSplash] = useState(true);

  const [firstLoginSetupChecked, setFirstLoginSetupChecked] = useState(false);

  const [seenFirstLoginSetup, setSeenFirstLoginSetup] = useState(false);

  // Consume any pending navigation stored by a notification tap (foreground/background/cold start).
  const consumePending = useCallback(async () => {
    logger.info("RootNavigator: consuming pending navigation");
    if (!isAuthenticated || !navigationRef.isReady()) return;
    const target = await pushNotificationService.consumePendingNavigation();
    logger.info("consumePending navigation target:", target);
    if (!target?.screen) return;
    logger.info("consumePending navigation route:", target.screen);
    const route = routeForScreen(target.screen);
    try {
      navigationRef.navigate(route.name, route.params ?? target.params);
    } catch {
      /* unknown route — ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setFirstLoginSetupChecked(true);
      return;
    }

    let mounted = true;

    const checkFirstLoginSetup = async () => {
      try {
        const seen = await hasSeenFirstLoginSetup(user.id);

        if (mounted) {
          setSeenFirstLoginSetup(seen);
        }
      } catch (error) {
        logger.warn("Failed to check first login setup", error);

        if (mounted) {
          setSeenFirstLoginSetup(false);
        }
      } finally {
        if (mounted) {
          setFirstLoginSetupChecked(true);
        }
      }
    };

    void checkFirstLoginSetup();

    return () => {
      mounted = false;
    };
  }, [isInitialized, isAuthenticated, user?.id]);

  useEffect(() => {
    logger.info(
      "RootNavigator: setting up AppState listener for pending navigation",
    );
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") consumePending();
    });
    logger.info(
      "RootNavigator: AppState listener set up for pending navigation",
      sub,
    );
    return () => sub.remove();
  }, [consumePending]);

  if (
    !isInitialized ||
    showSplash ||
    (isAuthenticated && !firstLoginSetupChecked)
  ) {
    return <AnimatedSplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),

    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),

      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };
  return (
    <NavigationContainer
      key={i18n.language}
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
        ) : !seenFirstLoginSetup ? (
          <Stack.Screen name="FirstLoginSetup">
            {() => (
              <FirstLoginSetupNavigator
                onComplete={() => {
                  setSeenFirstLoginSetup(true);
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Subscription"
              component={SubscriptionScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="ComparePlans"
              component={ComparePlansScreen}
              options={{
                presentation: "modal",
                headerShown: true,
                title: t("navigation.comparePlans"),
              }}
            />
            <Stack.Screen
              name="WeeklyReview"
              component={WeeklyReviewScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="Focus"
              component={FocusScreen}
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="Goals" component={GoalsStack} />
            <Stack.Screen name="Routines" component={RoutinesStack} />

            <Stack.Screen name="Alarms" component={AlarmsStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
