import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, spacing, typography } from '@/theme/tokens';

const MOCK_TASKS = [
  { id: '1', title: 'Review morning routine', status: 'TODO' },
  { id: '2', title: 'Deep work — project milestone', status: 'IN_PROGRESS' },
];

export const TasksScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Tasks</Text>
    <Text style={styles.sub}>Focused list — no clutter.</Text>
    <FlatList
      data={MOCK_TASKS}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ paddingBottom: 100 }}
      ListEmptyComponent={
        <EmptyState
          title="No tasks yet"
          message="Create a task from a goal or add one for today."
          actionLabel="Add task"
          onAction={() => {}}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.badge}>{item.status}</Text>
        </TouchableOpacity>
      )}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowTitle: { ...typography.body, color: colors.text },
  badge: { ...typography.label, color: colors.primary, fontSize: 10 },
});
