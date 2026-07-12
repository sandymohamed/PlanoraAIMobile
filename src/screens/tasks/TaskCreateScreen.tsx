import React, { useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
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
import { showError } from '@/components/ConfirmationDialog';
import { setPendingAnalyticsContext } from '@/analytics/pendingContext';
import { useTranslation } from 'react-i18next';

type Route = RouteProp<TasksStackParamList, 'TaskCreate'>;
type Nav = NativeStackNavigationProp<TasksStackParamList, 'TaskCreate'>;

export const TaskCreateScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { createTask, isLoading } = useTaskStore();
  const { t } = useTranslation();
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
      if (route.params?.dueDate) {
        setPendingAnalyticsContext({ taskCreateSource: 'calendar' });
      }
      await createTask(payload);
      navigation.goBack();
    } catch (e) {
      showError('Could not create task', getApiErrorMessage(e));
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
        hasTime={due.hasTime}
        selectedDateTime={due.selectedDateTime}
        onDueChange={(d) => patch(due.applyDueDateTime(d))}
        onToggleHasTime={(v) => patch(due.toggleHasTime(v, values))}
        onClearDue={() => patch(due.clearDue())}
      />
      <View style={styles.footer}>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        <Button label={t(`tasks.form.createTask`)} onPress={handleSave} loading={isLoading} disabled={isLoading} />
        <Button label={t(`common.cancel`)} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
