import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTaskStore } from '@/store/taskStore';
import { TaskPriority, TaskStatus, UpdateTaskData } from '@/types/task';
import { TaskForm, TaskFormValues } from '@/components/tasks/TaskForm';
import { useTaskDueDate, validateTaskForm } from '@/hooks/useTaskDueDate';
import { Button } from '@/components/ui/Button';
import { TasksStackParamList } from '@/navigation/TasksStack';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { showError } from '@/components/ConfirmationDialog';

type Route = RouteProp<TasksStackParamList, 'TaskEdit'>;
type Nav = NativeStackNavigationProp<TasksStackParamList, 'TaskEdit'>;

export const TaskEditScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { taskId } = useRoute<Route>().params;
  const { tasks, updateTask, fetchTask, isLoading } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);

  const [values, setValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);
  const due = useTaskDueDate({ dueDate: task?.dueDate, dueTime: task?.dueTime });

  useEffect(() => {
    if (!task) fetchTask(taskId).catch(() => {});
  }, [task, taskId, fetchTask]);

  useEffect(() => {
    if (!task) return;
    setValues({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
    });
  }, [task]);

  const patch = (p: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...p }));

  const handleSave = async () => {
    if (submittingRef.current || isLoading) return;
    const validation = validateTaskForm(values);
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }
    submittingRef.current = true;
    const payload: UpdateTaskData = {
      title: values.title.trim(),
      description: values.description,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate,
      dueTime: values.dueTime,
    };
    try {
      await updateTask(taskId, payload);
      navigation.goBack();
    } catch (e) {
      showError('Could not update task', getApiErrorMessage(e));
    } finally {
      submittingRef.current = false;
    }
  };

  if (!task && isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>Task not found</Text>
        <Button label="Go back" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

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
        <Button label="Save changes" onPress={handleSave} loading={isLoading} disabled={isLoading} />
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  missing: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
});
