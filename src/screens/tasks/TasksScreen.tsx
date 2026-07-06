import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon as Icon } from '@/components/ui/AppIcon';
import { useTaskStore } from '@/store/taskStore';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { TasksStackParamList } from '@/navigation/TasksStack';
import { EmptyState } from '@/components/ui/EmptyState';
import { showDeleteConfirmation, showError } from '@/components/ConfirmationDialog';
import { colors, spacing, typography } from '@/theme/tokens';
import { sortTasksByDueDate } from '@/utils/taskUi';
import { TaskListRow } from '@/components/tasks/TaskListRow';
import { getApiErrorMessage } from '@/utils/apiError';
import { AdBanner } from '@/features/ads';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;

/** `all` = active work (everything except done) */
type StatusTab = 'all' | TaskStatus;

const STATUS_FILTERS: { label: string; value: StatusTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'To do', value: TaskStatus.TODO },
  { label: 'Active', value: TaskStatus.IN_PROGRESS },
  { label: 'Done', value: TaskStatus.DONE },
];

const ALL_OPEN_STATUSES: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.ARCHIVED,
];

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const filteredTasks = useTaskStore((s) => s.filteredTasks);
  const isLoading = useTaskStore((s) => s.isLoading);
  const error = useTaskStore((s) => s.error);
  const searchQuery = useTaskStore((s) => s.searchQuery);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const refreshTasks = useTaskStore((s) => s.refreshTasks);
  const setSearchQuery = useTaskStore((s) => s.setSearchQuery);
  const setFilter = useTaskStore((s) => s.setFilter);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const uncompleteTask = useTaskStore((s) => s.uncompleteTask);
  const setCurrentTask = useTaskStore((s) => s.setCurrentTask);
  const clearError = useTaskStore((s) => s.clearError);

  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const sortedTasks = useMemo(() => sortTasksByDueDate(filteredTasks), [filteredTasks]);
  const fetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setFilter({ status: ALL_OPEN_STATUSES });
      fetchTasks()
        .catch(() => {})
        .finally(() => {
          fetchingRef.current = false;
        });
      return () => {
        fetchingRef.current = false;
      };
    }, [fetchTasks, setFilter])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshTasks();
    } finally {
      setRefreshing(false);
    }
  }, [refreshTasks]);

  const applyStatusFilter = useCallback((tab: StatusTab) => {
    setStatusTab(tab);
    if (tab === 'all') {
      setFilter({ status: ALL_OPEN_STATUSES });
    } else {
      setFilter({ status: [tab] });
    }
  }, [setFilter]);

  const handleCreate = useCallback(() => navigation.navigate('TaskCreate', {}), [navigation]);

  const handleOpen = useCallback((task: Task) => {
    setCurrentTask(task);
    navigation.navigate('TaskDetail', { taskId: task.id });
  }, [navigation, setCurrentTask]);

  const toggleTaskComplete = useCallback(async (task: Task) => {
    if (task.status !== TaskStatus.DONE) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(160, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
      );
    }
    if (task.status === TaskStatus.DONE) await uncompleteTask(task.id);
    else await completeTask(task.id);
  }, [completeTask, uncompleteTask]);

  const handleDelete = useCallback((task: Task) => {
    showDeleteConfirmation(task.title, async () => {
      try {
        await deleteTask(task.id);
      } catch (e) {
        showError('Error', getApiErrorMessage(e));
      }
    });
  }, [deleteTask]);

  const renderTask = useCallback(({ item: task }: { item: Task }) => (
    <TaskListRow
      task={task}
      onPress={() => handleOpen(task)}
      onToggleComplete={async () => {
        try {
          await toggleTaskComplete(task);
        } catch (e) {
          showError('Error', getApiErrorMessage(e));
          throw e;
        }
      }}
      onDelete={() => handleDelete(task)}
    />
  ), [handleDelete, handleOpen, toggleTaskComplete]);

  const keyExtractor = useCallback((task: Task) => task.id, []);

  const listEmpty = useMemo(() => (
    <EmptyState
      title="No tasks yet"
      message="Add your first task to start planning your day."
      actionLabel="Add task"
      onAction={handleCreate}
    />
  ), [handleCreate]);

  const refreshControl = useMemo(() => (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
  ), [onRefresh, refreshing]);

  const listHeader = useMemo(() => (
    <>
      <Text style={styles.title}>Tasks</Text>
      <View style={styles.searchWrap}>
        <Icon name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search tasks..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.chips}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.chip, statusTab === f.value && styles.chipActive]}
            onPress={() => applyStatusFilter(f.value)}
          >
            <Text style={[styles.chipText, statusTab === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? (
        <TouchableOpacity style={styles.errorBox} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : null}
      <AdBanner placement="tasks" />
    </>
  ), [applyStatusFilter, clearError, error, searchQuery, setSearchQuery, statusTab]);

  return (
    <View style={styles.container}>
      {isLoading && sortedTasks.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={keyExtractor}
          renderItem={renderTask}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleCreate} activeOpacity={0.9}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  search: { flex: 1, color: colors.text, paddingVertical: spacing.md, ...typography.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.textSecondary, fontSize: 11 },
  chipTextActive: { color: colors.primary },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.error, ...typography.caption },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
