import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AlarmsScreen } from '@/screens/alarms/AlarmsScreen';
import { AlarmCreateScreen } from '@/screens/alarms/AlarmCreateScreen';
import { colors } from '@/theme/tokens';

export type AlarmsStackParamList = {
  AlarmsList: undefined;
  AlarmCreate: undefined;
};

const Stack = createNativeStackNavigator<AlarmsStackParamList>();

export const AlarmsStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="AlarmsList" component={AlarmsScreen} options={{ title: 'Alarms' }} />
    <Stack.Screen name="AlarmCreate" component={AlarmCreateScreen} options={{ title: 'New alarm' }} />
  </Stack.Navigator>
);
