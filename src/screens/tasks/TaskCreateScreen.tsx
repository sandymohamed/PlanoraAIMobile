import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTaskStore } from '@/store/taskStore';
import { CreateTaskData, TaskPriority, TaskStatus } from '@/types/task';
import { TaskForm, TaskFormValues } from '@/components/tasks/TaskForm';
import { useTaskDueDate, validateTaskForm } from '@/hooks/useTaskDueDate';
import { Button } from '@/components/ui/Button';
import { TasksStackParamList } from '@/navigation/TasksStack';
import { colors, spacing } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';

type Route = RouteProp<TasksStackParamList, 'TaskCreate'>;
type Nav = NativeStackNavigationProp<TasksStackParamList, 'TaskCreate'>;

export const TaskCreateScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { createTask, isLoading } = useTaskStore();

  const [values, setValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    dueDate: route.params?.dueDate,
    dueTime: route.params?.dueTime,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);
  const due = useTaskDueDate({ dueDate: route.params?.dueDate, dueTime: route.params?.dueTime });

  const patch = (p: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...p }));

  const handleSave = async () => {
    if (submittingRef.current || isLoading) return;
    const validation = validateTaskForm(values);
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    submittingRef.current = true;
    const payload: CreateTaskData = {
      title: values.title.trim(),
      description: values.description ?? '',
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate,
      dueTime: values.dueTime,
      projectId: route.params?.projectId,
      goalId: route.params?.goalId,
    };

    try {
      await createTask(payload);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not create task', getApiErrorMessage(e));
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <TaskForm
        values={values}
        errors={errors}
        onChange={patch}
        showDatePicker={due.showDatePicker}
        showTimePicker={due.showTimePicker}
        selectedDate={due.selectedDate}
        selectedTime={due.selectedTime}
        hasTime={due.hasTime}
        onToggleDatePicker={() => due.setShowDatePicker(!due.showDatePicker)}
        onToggleTimePicker={() => due.setShowTimePicker(!due.showTimePicker)}
        onDateChange={(d) => d && patch(due.applyDate(d, values))}
        onTimeChange={(t) => t && patch(due.applyTime(t, values))}
        onToggleHasTime={(v) => patch(due.toggleHasTime(v, values))}
        onClearDue={() => patch(due.clearDue())}
      />
      <View style={styles.footer}>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        <Button label="Create task" onPress={handleSave} loading={isLoading} disabled={isLoading} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
