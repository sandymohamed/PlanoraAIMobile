import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { TasksScreen } from "@/screens/tasks/TasksScreen";
import { TaskCreateScreen } from "@/screens/tasks/TaskCreateScreen";
import { TaskEditScreen } from "@/screens/tasks/TaskEditScreen";
import { TaskDetailScreen } from "@/screens/tasks/TaskDetailScreen";
import { usePlanoraTheme } from "@/theme/ThemeProvider";
import { createStackHeaderOptions } from "@/navigation/headerOptions";

export type TasksStackParamList = {
  TasksList: undefined;
  TaskCreate: {
    projectId?: string;
    goalId?: string;
    dueDate?: string;
    dueTime?: string;
  };
  TaskEdit: { taskId: string };
  TaskDetail: { taskId: string };
};

const Stack = createNativeStackNavigator<TasksStackParamList>();

export const TasksStack: React.FC = () => {
  const { t } = useTranslation();

  const { colors } = usePlanoraTheme();
  const stackHeaderOptions = createStackHeaderOptions(colors);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        ...stackHeaderOptions,
        headerTitleStyle: { fontWeight: "600" },
        animation: "slide_from_right", 
        freezeOnBlur: true,
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="TasksList"
        component={TasksScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskCreate"
        component={TaskCreateScreen}
        options={{ title: t("navigation.newTask") }}
      />
      <Stack.Screen
        name="TaskEdit"
        component={TaskEditScreen}
        options={{ title: t("navigation.editTask") }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: t("navigation.task") }}
      />
    </Stack.Navigator>
  );
};
