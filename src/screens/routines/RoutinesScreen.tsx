import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { routineService } from '@/services/routineService';
import { useAlarmStore } from '@/store/alarmStore';
import { Routine } from '@/types/routine';
import { RoutinesStackParamList } from '@/navigation/RoutinesStack';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';

type Nav = NativeStackNavigationProp<RoutinesStackParamList, 'RoutinesList'>;

export const RoutinesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const fetchAlarms = useAlarmStore((s) => s.fetchAlarms);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false);

  const loadRoutines = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const data = await routineService.getUserRoutines();
      setRoutines(data);
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await routineService.toggleTaskCompletion(taskId, !completed);
      await loadRoutines();
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e));
    }
  };

  const resetRoutine = (id: string) => {
    Alert.alert('Reset routine', 'Reset all sub-task completion for this period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          try {
            await routineService.resetRoutine(id);
            await loadRoutines();
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  const deleteRoutine = (routine: Routine) => {
    Alert.alert('Delete routine', `Delete "${routine.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await routineService.deleteRoutine(routine.id);
            await fetchAlarms(1, 1000, true);
            await loadRoutines();
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Routines</Text>
      <Text style={styles.sub}>Recurring habits with reset and reminders</Text>

      {loading && routines.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
        >
          {routines.length === 0 ? (
            <EmptyState
              title="No routines"
              message="Build a daily or weekly habit loop."
              actionLabel="Create routine"
              onAction={() => navigation.navigate('RoutineCreate')}
            />
          ) : (
            routines.map((routine) => (
              <View key={routine.id} style={styles.card}>
                <TouchableOpacity onPress={() => navigation.navigate('RoutineEdit', { routineId: routine.id })}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{routine.title}</Text>
                    <Text style={[styles.badge, !routine.enabled && styles.badgeOff]}>
                      {routine.enabled ? routine.frequency : 'OFF'}
                    </Text>
                  </View>
                  <Text style={styles.schedule}>
                    {routine.schedule.time || '—'} · {routine.frequency}
                    {routine.schedule.days?.length
                      ? ` · days ${routine.schedule.days.join(',')}`
                      : ''}
                  </Text>
                </TouchableOpacity>
                {routine.routineTasks?.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    onPress={() => toggleTask(task.id, task.completed)}
                  >
                    <Icon
                      name={task.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={22}
                      color={task.completed ? colors.success : colors.textMuted}
                    />
                    <Text style={[styles.taskTitle, task.completed && styles.taskDone]}>{task.title}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => resetRoutine(routine.id)}>
                    <Text style={styles.actionText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteRoutine(routine)}>
                    <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('RoutineCreate')}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sub: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  list: { padding: spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.h3, color: colors.text, flex: 1 },
  badge: { ...typography.label, color: colors.primary, fontSize: 10 },
  badgeOff: { color: colors.textMuted },
  schedule: { ...typography.caption, color: colors.textMuted, marginTop: 4, marginBottom: spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  taskTitle: { ...typography.body, color: colors.text },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
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
  },
});
