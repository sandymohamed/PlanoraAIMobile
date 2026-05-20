import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoalsScreen } from '@/screens/goals/GoalsScreen';
import { GoalDetailScreen } from '@/screens/goals/GoalDetailScreen';

const Stack = createNativeStackNavigator();

export const GoalsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: true, headerTintColor: '#F4F4F8' }}>
    <Stack.Screen name="GoalsList" component={GoalsScreen} options={{ title: 'Goals' }} />
    <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: 'Goal' }} />
  </Stack.Navigator>
);
