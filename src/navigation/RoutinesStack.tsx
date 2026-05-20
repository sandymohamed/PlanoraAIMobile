import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoutinesScreen } from '@/screens/routines/RoutinesScreen';

const Stack = createNativeStackNavigator();

export const RoutinesStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name="RoutinesList" component={RoutinesScreen} options={{ title: 'Routines' }} />
  </Stack.Navigator>
);
