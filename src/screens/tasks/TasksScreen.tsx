import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTaskStore } from '@/store/taskStore';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { TasksStackParamList } from '@/navigation/TasksStack';
import { EmptyState } from '@/components/ui/EmptyState';
import { showDeleteConfirmation } from '@/components/ConfirmationDialog';
import { colors, spacing, typography } from '@/theme/tokens';
import { formatDueLabel, priorityColor, statusColor } from '@/utils/taskUi';
import { getApiErrorMessage } from '@/utils/apiError';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;

let DraggableFlatList: React.ComponentType<any> | null = null;
try {
  DraggableFlatList = require('react-native-draggable-flatlist').default;
} catch {
  DraggableFlatList = null;
}

const STATUS_FILTERS: { label: string; value?: TaskStatus }[] = [
  { label: 'All' },
  { label: 'To do', value: TaskStatus.TODO },
  { label: 'Active', value: TaskStatus.IN_PROGRESS },
  { label: 'Done', value: TaskStatus.DONE },
];

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {
    filteredTasks,
    isLoading,
    error,
    searchQuery,
    fetchTasks,
    refreshTasks,
    setSearchQuery,
    setFilter,
    clearFilters,
    deleteTask,
    completeTask,
    uncompleteTask,
    updateTaskOrder,
    setCurrentTask,
    clearError,
  } = useTaskStore();

  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const fetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      fetchTasks()
        .catch(() => {})
        .finally(() => {
          fetchingRef.current = false;
        });
      return () => {
        fetchingRef.current = false;
      };
    }, [fetchTasks])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTasks();
    } finally {
      setRefreshing(false);
    }
  };

  const applyStatusFilter = (status?: TaskStatus) => {
    setStatusFilter(status);
    if (status) setFilter({ status: [status] });
    else clearFilters();
  };

  const handleCreate = () => navigation.navigate('TaskCreate', {});

  const handleOpen = (task: Task) => {
    setCurrentTask(task);
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      if (task.status === TaskStatus.DONE) await uncompleteTask(task.id);
      else await completeTask(task.id);
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e));
    }
  };

  const handleDelete = (task: Task) => {
    showDeleteConfirmation(task.title, async () => {
      try {
        await deleteTask(task.id);
      } catch (e) {
        Alert.alert('Error', getApiErrorMessage(e));
      }
    });
  };

  const renderTask = ({ item: task, drag }: { item: Task; drag?: () => void }) => (
    <TouchableOpacity
      style={[styles.row, task.status === TaskStatus.DONE && styles.rowDone]}
      onPress={() => handleOpen(task)}
      onLongPress={drag}
      activeOpacity={0.85}
    >
      <TouchableOpacity
        style={styles.check}
        onPress={() => handleToggleComplete(task)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon
          name={task.status === TaskStatus.DONE ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={26}
          color={task.status === TaskStatus.DONE ? colors.success : colors.textMuted}
        />
      </TouchableOpacity>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, task.status === TaskStatus.DONE && styles.rowTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {formatDueLabel(task.dueDate, task.dueTime) ? (
          <Text style={styles.due}>{formatDueLabel(task.dueDate, task.dueTime)}</Text>
        ) : null}
        <View style={styles.meta}>
          <View style={[styles.badge, { borderColor: priorityColor(task.priority) }]}>
            <Text style={[styles.badgeText, { color: priorityColor(task.priority) }]}>{task.priority}</Text>
          </View>
          <Text style={[styles.statusText, { color: statusColor(task.status) }]}>{task.status}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(task)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="trash-can-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const listHeader = (
    <>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.sub}>Your real tasks from Planora API</Text>
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
            style={[styles.chip, statusFilter === f.value && styles.chipActive]}
            onPress={() => applyStatusFilter(f.value)}
          >
            <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? (
        <TouchableOpacity style={styles.errorBox} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      {isLoading && filteredTasks.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : DraggableFlatList ? (
        <DraggableFlatList
          data={filteredTasks}
          keyExtractor={(t: Task) => t.id}
          onDragEnd={({ data }: { data: Task[] }) => updateTaskOrder(data)}
          renderItem={({ item, drag }: { item: Task; drag: () => void }) => renderTask({ item, drag })}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <EmptyState
              title="No tasks yet"
              message="Add your first task to start planning your day."
              actionLabel="Add task"
              onAction={handleCreate}
            />
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {listHeader}
          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              message="Add your first task to start planning your day."
              actionLabel="Add task"
              onAction={handleCreate}
            />
          ) : (
            filteredTasks.map((task) => <View key={task.id}>{renderTask({ item: task })}</View>)
          )}
        </ScrollView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowDone: { opacity: 0.75 },
  check: { marginRight: spacing.sm, marginTop: 2 },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  rowTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  due: { ...typography.caption, color: colors.accent, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  statusText: { ...typography.label, fontSize: 10 },
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
