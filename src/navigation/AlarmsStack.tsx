import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AlarmsScreen } from '@/screens/alarms/AlarmsScreen';
import { AlarmCreateScreen } from '@/screens/alarms/AlarmCreateScreen';
import { AlarmEditScreen } from '@/screens/alarms/AlarmEditScreen';
import { colors } from '@/theme/tokens';

export type AlarmsStackParamList = {
  AlarmsList: undefined;
  AlarmCreate: undefined;
  AlarmEdit: { alarmId: string };
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
    <Stack.Screen name="AlarmEdit" component={AlarmEditScreen} options={{ title: 'Edit alarm' }} />
  </Stack.Navigator>
);
