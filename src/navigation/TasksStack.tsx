import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TasksScreen } from '@/screens/tasks/TasksScreen';
import { TaskCreateScreen } from '@/screens/tasks/TaskCreateScreen';
import { TaskEditScreen } from '@/screens/tasks/TaskEditScreen';
import { TaskDetailScreen } from '@/screens/tasks/TaskDetailScreen';
import { colors } from '@/theme/tokens';

export type TasksStackParamList = {
  TasksList: undefined;
  TaskCreate: { projectId?: string; goalId?: string; dueDate?: string; dueTime?: string };
  TaskEdit: { taskId: string };
  TaskDetail: { taskId: string };
};

const Stack = createNativeStackNavigator<TasksStackParamList>();

export const TasksStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: '600' },
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="TasksList" component={TasksScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TaskCreate" component={TaskCreateScreen} options={{ title: 'New task' }} />
    <Stack.Screen name="TaskEdit" component={TaskEditScreen} options={{ title: 'Edit task' }} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
  </Stack.Navigator>
);
