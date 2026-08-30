import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/auth/ResetPasswordScreen";
import { usePlanoraTheme } from "@/theme/ThemeProvider";
import { createStackHeaderOptions } from "@/navigation/headerOptions";

const Stack = createNativeStackNavigator();

export const AuthNavigator: React.FC = () => {
  const { t } = useTranslation();

  const { colors } = usePlanoraTheme();
  const stackHeaderOptions = createStackHeaderOptions(colors);

  return (
    <Stack.Navigator
      screenOptions={{
        ...stackHeaderOptions,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t("auth.createAccount") }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: t("auth.resetPassword") }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: t("auth.newPassword") }}
      />
    </Stack.Navigator>
  );
};
