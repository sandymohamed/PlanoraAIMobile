import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTaskStore } from '@/store/taskStore';
import { TaskStatus } from '@/types/task';
import { Button } from '@/components/ui/Button';
import { showDeleteConfirmation, showError, showSuccess } from '@/components/ConfirmationDialog';
import { TasksStackParamList } from '@/navigation/TasksStack';
import { colors, spacing, typography } from '@/theme/tokens';
import { formatDueLabel, priorityColor, statusColor, translateTaskPriority, translateTaskStatus } from '@/utils/taskUi';
import { getApiErrorMessage } from '@/utils/apiError';
import { useTranslation } from 'react-i18next';

type Route = RouteProp<TasksStackParamList, 'TaskDetail'>;
type Nav = NativeStackNavigationProp<TasksStackParamList, 'TaskDetail'>;

export const TaskDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  
  const { taskId } = useRoute<Route>().params;
  const { tasks, fetchTask, completeTask, uncompleteTask, deleteTask, isLoading } = useTaskStore();
  const task = tasks.find((t) => t.id === taskId);
  useEffect(() => {
    if (!task) fetchTask(taskId).catch(() => {});
  }, [task, taskId, fetchTask]);

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
        <Text style={styles.muted}>Task not found</Text>
        <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const toggleComplete = async () => {
    try {
      if (task.status === TaskStatus.DONE) {
        await uncompleteTask(task.id);
      } else {
        await completeTask(task.id);
        showSuccess(
          t('tasks.details.completeTitle'),
          t('tasks.details.completeMessage', { title: task.title })
        );
      }
    } catch (e) {
      showError(t('common.error'), getApiErrorMessage(e));
    }
  };

  const handleDelete = () => {
    showDeleteConfirmation(task.title, async () => {
      try {
        await deleteTask(task.id);
        navigation.goBack();
      } catch (e) {
        showError('Error', getApiErrorMessage(e));
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{task.title}</Text>
      {task.description ? <Text style={styles.body}>{task.description}</Text> : null}

      <View style={styles.metaRow}>
        <View style={[styles.pill, { borderColor: priorityColor(task.priority) }]}>
          <Text style={{ color: priorityColor(task.priority), fontWeight: '700', fontSize: 12 }}>{translateTaskPriority(task.priority)}</Text>
        </View>
        <View style={[styles.pill, { borderColor: statusColor(task.status) }]}>
          <Text style={{ color: statusColor(task.status), fontWeight: '700', fontSize: 12 }}>{translateTaskStatus(task.status)}</Text>
        </View>
      </View>

      {formatDueLabel(task.dueDate, task.dueTime) ? (
        <View style={styles.dueBox}>
          <Icon name="calendar-clock" size={20} color={colors.accent} />
          <Text style={styles.dueText}>{formatDueLabel(task.dueDate, task.dueTime)}</Text>
        </View>
      ) : null}

      <Button
        label={task.status === TaskStatus.DONE ? t(`tasks.details.markIncomplete`): t(`tasks.details.markComplete`)}
        onPress={toggleComplete}
      />
      <Button label={t(`tasks.details.editTask`)} variant="secondary" onPress={() => navigation.navigate('TaskEdit', { taskId })} />
      <Button label={t(`tasks.details.deleteTask`)} variant="ghost" onPress={handleDelete} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  pill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  dueBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  dueText: { ...typography.body, color: colors.accent },
  muted: { ...typography.body, color: colors.textMuted },
});
