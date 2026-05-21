import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoutinesScreen } from '@/screens/routines/RoutinesScreen';
import { RoutineCreateScreen } from '@/screens/routines/RoutineCreateScreen';
import { RoutineEditScreen } from '@/screens/routines/RoutineEditScreen';
import { colors } from '@/theme/tokens';

export type RoutinesStackParamList = {
  RoutinesList: undefined;
  RoutineCreate: undefined;
  RoutineEdit: { routineId: string };
};

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

export const RoutinesStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="RoutinesList" component={RoutinesScreen} options={{ headerShown: false }} />
    <Stack.Screen name="RoutineCreate" component={RoutineCreateScreen} options={{ title: 'New routine' }} />
    <Stack.Screen name="RoutineEdit" component={RoutineEditScreen} options={{ title: 'Edit routine' }} />
  </Stack.Navigator>
);
