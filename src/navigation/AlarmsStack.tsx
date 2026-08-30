import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { AlarmsScreen } from "@/screens/alarms/AlarmsScreen";
import { AlarmCreateScreen } from "@/screens/alarms/AlarmCreateScreen";
import { AlarmEditScreen } from "@/screens/alarms/AlarmEditScreen";
import { usePlanoraTheme } from "@/theme/ThemeProvider";
import { createStackHeaderOptions } from "@/navigation/headerOptions";

export type AlarmsStackParamList = {
  AlarmsList: undefined;
  AlarmCreate: undefined;
  AlarmEdit: { alarmId: string };
};

const Stack = createNativeStackNavigator<AlarmsStackParamList>();

export const AlarmsStack: React.FC = () => {
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
        name="AlarmsList"
        component={AlarmsScreen}
        options={{ title: t("navigation.alarms") }}
      />
      <Stack.Screen
        name="AlarmCreate"
        component={AlarmCreateScreen}
        options={{ title: t("navigation.newAlarm") }}
      />
      <Stack.Screen
        name="AlarmEdit"
        component={AlarmEditScreen}
        options={{ title: t("navigation.editAlarm") }}
      />
    </Stack.Navigator>
  );
};
