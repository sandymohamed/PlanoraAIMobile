import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { GoalsScreen } from '@/screens/goals/GoalsScreen';
import { GoalDetailScreen } from '@/screens/goals/GoalDetailScreen';
import { GoalCreateScreen } from '@/screens/goals/GoalCreateScreen';
import { GoalEditScreen } from '@/screens/goals/GoalEditScreen';
import { colors } from '@/theme/tokens';
import { stackHeaderOptions } from '@/navigation/headerOptions';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: true,
  ...stackHeaderOptions,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
};

export const GoalsStack: React.FC = () => (
  <TranslatedGoalsStack />
);

const TranslatedGoalsStack: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="GoalsList" component={GoalsScreen} options={{ title: t('navigation.goals') }} />
      <Stack.Screen name="GoalCreate" component={GoalCreateScreen} options={{ title: t('navigation.newGoal') }} />
      <Stack.Screen name="GoalEdit" component={GoalEditScreen} options={{ title: t('navigation.editGoal') }} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} options={{ title: t('navigation.goal') }} />
    </Stack.Navigator>
  );
};
