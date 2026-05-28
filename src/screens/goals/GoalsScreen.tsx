import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useGoalStore } from '@/store/goalStore';
import { Goal, GoalStatus } from '@/types/goal';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { format, isAfter, differenceInDays } from 'date-fns';
import { BannerAdPlaceholder } from '@/features/ads';

const STATUS_FILTERS: { key: 'all' | 'active' | 'completed'; label: string; statuses?: GoalStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active', statuses: [GoalStatus.ACTIVE, GoalStatus.DRAFT, GoalStatus.PAUSED] },
  { key: 'completed', label: 'Done', statuses: [GoalStatus.DONE] },
];

export const GoalsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    filteredGoals,
    isLoading,
    searchQuery,
    fetchGoals,
    loadMoreGoals,
    hasNextPage,
    setSearchQuery,
    applyFilters,
    setStatusFilter,
    deleteGoal,
    completeGoal,
  } = useGoalStore();

  const [viewMode, setViewMode] = useState<'all' | 'active' | 'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  const applyViewMode = (mode: typeof viewMode) => {
    setViewMode(mode);
    const cfg = STATUS_FILTERS.find((f) => f.key === mode);
    setStatusFilter(cfg?.statuses ?? []);
    applyFilters();
    fetchGoals();
  };

  const onSearchSubmit = () => {
    setSearchQuery(localSearch);
    fetchGoals();
  };

  const onGoalPress = (goal: Goal) => {
    navigation.navigate('GoalDetail', { goalId: goal.id });
  };

  const onGoalLongPress = (goal: Goal) => {
    Alert.alert(goal.title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await completeGoal(goal.id);
          } catch (e) {
            Alert.alert('Error', getApiErrorMessage(e));
          }
        },
      },
      {
        text: 'Edit',
        onPress: () => navigation.navigate('GoalEdit', { goalId: goal.id }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete goal?', goal.title, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteGoal(goal.id);
                } catch (e) {
                  Alert.alert('Error', getApiErrorMessage(e));
                }
              },
            },
          ]),
      },
    ]);
  };

  const renderGoal = ({ item }: { item: Goal }) => {
    const overdue =
      item.targetDate && item.status !== GoalStatus.DONE && isAfter(new Date(), new Date(item.targetDate));
    const daysLeft = item.targetDate ? differenceInDays(new Date(item.targetDate), new Date()) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onGoalPress(item)}
        onLongPress={() => onGoalLongPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.badge, statusStyle(item.status)]}>{item.status}</Text>
        </View>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, item.progress || 0)}%` }]} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>{Math.round(item.progress || 0)}%</Text>
          <Text style={styles.metaText}>{item.category}</Text>
          {item.targetDate ? (
            <Text style={[styles.metaText, overdue && styles.overdue]}>
              {overdue ? 'Overdue' : daysLeft !== null ? `${daysLeft}d left` : format(new Date(item.targetDate), 'MMM d')}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search goals..."
        placeholderTextColor={colors.textMuted}
        value={localSearch}
        onChangeText={setLocalSearch}
        onSubmitEditing={onSearchSubmit}
        returnKeyType="search"
      />
      <View style={styles.chips}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, viewMode === f.key && styles.chipActive]}
            onPress={() => applyViewMode(f.key)}
          >
            <Text style={[styles.chipText, viewMode === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && filteredGoals.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filteredGoals}
          keyExtractor={(g) => g.id}
          renderItem={renderGoal}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={() => hasNextPage && loadMoreGoals()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.empty}>No goals yet. Create one to get started.</Text>}
          ListFooterComponent={<BannerAdPlaceholder placement="goals" />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('GoalCreate')} activeOpacity={0.9}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

function statusStyle(status: GoalStatus) {
  switch (status) {
    case GoalStatus.DONE:
      return { color: colors.success };
    case GoalStatus.PAUSED:
      return { color: colors.warning };
    case GoalStatus.CANCELLED:
      return { color: colors.textMuted };
    default:
      return { color: colors.primary };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chips: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.background, fontWeight: '600' },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { ...typography.h3, color: colors.text, flex: 1 },
  badge: { ...typography.caption, fontWeight: '600' },
  cardDesc: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  progressTrack: {
    height: 6,
    backgroundColor: colors.borderSubtle,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  metaText: { ...typography.caption, color: colors.textMuted },
  overdue: { color: colors.error },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
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
    elevation: 4,
  },
  fabText: { fontSize: 28, color: colors.background, fontWeight: '300', marginTop: -2 },
});
