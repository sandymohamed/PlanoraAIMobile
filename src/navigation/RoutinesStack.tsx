import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RoutinesScreen } from '@/screens/routines/RoutinesScreen';
import { RoutineCreateScreen } from '@/screens/routines/RoutineCreateScreen';
import { RoutineEditScreen } from '@/screens/routines/RoutineEditScreen';
import { colors } from '@/theme/tokens';
import { stackHeaderOptions } from '@/navigation/headerOptions';

export type RoutinesStackParamList = {
  RoutinesList: undefined;
  RoutineCreate: undefined;
  RoutineEdit: { routineId: string };
};

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

export const RoutinesStack: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        ...stackHeaderOptions,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="RoutinesList" component={RoutinesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RoutineCreate" component={RoutineCreateScreen} options={{ title: t('navigation.newRoutine') }} />
      <Stack.Screen name="RoutineEdit" component={RoutineEditScreen} options={{ title: t('navigation.editRoutine') }} />
    </Stack.Navigator>
  );
};
