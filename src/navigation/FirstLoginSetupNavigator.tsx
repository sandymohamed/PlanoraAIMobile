import React from "react";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

import { FirstLoginLanguageScreen } from "@/screens/onboarding/FirstLoginLanguageScreen";
import { FirstLoginThemeScreen } from "@/screens/onboarding/FirstLoginThemeScreen";

export type FirstLoginSetupParamList = {
  FirstLoginLanguage: undefined;
  FirstLoginTheme: undefined;
};

const Stack =
  createNativeStackNavigator<FirstLoginSetupParamList>();

type Props = {
  onComplete: () => void;
};

export const FirstLoginSetupNavigator: React.FC<Props> = ({
  onComplete,
}) => {
  return (
    <Stack.Navigator
      initialRouteName="FirstLoginLanguage"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="FirstLoginLanguage"
        component={FirstLoginLanguageScreen}
      />

      <Stack.Screen name="FirstLoginTheme">
        {(props) => (
          <FirstLoginThemeScreen
            {...props}
            onComplete={onComplete}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};