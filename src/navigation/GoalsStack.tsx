import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GoalsScreen } from '@/screens/goals/GoalsScreen';
import { GoalDetailScreen } from '@/screens/goals/GoalDetailScreen';
import { GoalCreateScreen } from '@/screens/goals/GoalCreateScreen';
import { GoalEditScreen } from '@/screens/goals/GoalEditScreen';
import { colors } from '@/theme/tokens';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
};

export const GoalsStack: React.FC = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="GoalsList" component={GoalsScreen} options={{ title: 'Goals' }} />
    <Stack.Screen name="GoalCreate" component={GoalCreateScreen} options={{ title: 'New goal' }} />
    <Stack.Screen name="GoalEdit" component={GoalEditScreen} options={{ title: 'Edit goal' }} />
    <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: 'Goal' }} />
  </Stack.Navigator>
);
