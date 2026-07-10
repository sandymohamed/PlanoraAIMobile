import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useGoalStore } from '@/store/goalStore';
import { Goal, GoalStatus } from '@/types/goal';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { showError, showConfirmDialog, showActionSheet } from '@/components/ConfirmationDialog';
import { format, isAfter, differenceInDays } from 'date-fns';
import { AdBanner } from '@/features/ads';

const STATUS_FILTERS: { key: 'all' | 'active' | 'completed'; statuses?: GoalStatus[] }[] = [
  { key: 'all' },
  { key: 'active', statuses: [GoalStatus.ACTIVE, GoalStatus.DRAFT, GoalStatus.PAUSED] },
  { key: 'completed', statuses: [GoalStatus.DONE] },
];

export const GoalsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const textDir = { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' } as const;
  const rowDir = { flexDirection: isArabic ? 'row-reverse' : 'row' } as const;

  const {
    filteredGoals,
    isLoading,
    searchQuery,
    fetchGoals,
    loadMoreGoals,
    hasNextPage,
    setSearchQuery,
    clearFilters,
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
      return () => {
        setLocalSearch('');
        setViewMode('all');
        clearFilters();
      };
    }, [clearFilters, fetchGoals])
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

  const onSearchChange = (text: string) => {
    setLocalSearch(text);
    if (!text.trim() && searchQuery) {
      setSearchQuery('');
    }
  };

  const onGoalPress = (goal: Goal) => {
    navigation.navigate('GoalDetail', { goalId: goal.id });
  };

  const onGoalLongPress = (goal: Goal) => {
    showActionSheet({
      title: goal.title,
      options: [
        {
          label: t('goals.actions.complete'),
          icon: 'check-circle-outline',
          onPress: async () => {
            try {
              await completeGoal(goal.id);
            } catch (e) {
              showError(t('common.error'), getApiErrorMessage(e));
            }
          },
        },
        {
          label: t('goals.actions.edit'),
          icon: 'pencil-outline',
          onPress: () => navigation.navigate('GoalEdit', { goalId: goal.id }),
        },
        {
          label: t('goals.actions.delete'),
          icon: 'trash-can-outline',
          destructive: true,
          onPress: () =>
            showConfirmDialog({
              title: t('goals.actions.deleteTitle'),
              itemName: goal.title,
              confirmLabel: t('goals.actions.delete'),
              destructive: true,
              onConfirm: async () => {
                try {
                  await deleteGoal(goal.id);
                } catch (e) {
                  showError(t('common.error'), getApiErrorMessage(e));
                }
              },
            }),
        },
      ],
    });
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
        <View style={[styles.cardHeader, rowDir]}>
          <Text style={[styles.cardTitle, textDir]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.badge, textDir, statusStyle(item.status)]}>{t(`goals.status.${item.status}`)}</Text>
        </View>
        {item.description ? (
          <Text style={[styles.cardDesc, textDir]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, item.progress || 0)}%` }]} />
        </View>
        <View style={[styles.cardMeta, rowDir]}>
          <Text style={[styles.metaText, textDir]}>{Math.round(item.progress || 0)}%</Text>
          <Text style={[styles.metaText, textDir]}>{t(`goals.categories.${item.category}`, { defaultValue: item.category })}</Text>
          {item.targetDate ? (
            <Text style={[styles.metaText, textDir, overdue && styles.overdue]}>
              {overdue
                ? t('goals.screen.overdue')
                : daysLeft !== null
                  ? t('goals.screen.daysLeft', { count: daysLeft })
                  : format(new Date(item.targetDate), 'MMM d')}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.search, textDir]}
        placeholder={t('goals.screen.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={localSearch}
        onChangeText={onSearchChange}
        onSubmitEditing={onSearchSubmit}
        returnKeyType="search"
      />
      <View style={[styles.chips, rowDir]}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, viewMode === f.key && styles.chipActive]}
            onPress={() => applyViewMode(f.key)}
          >
            <Text style={[styles.chipText, textDir, viewMode === f.key && styles.chipTextActive]}>{t(`goals.filter.${f.key}`)}</Text>
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
          ListEmptyComponent={<Text style={[styles.empty, textDir]}>{t('goals.screen.empty')}</Text>}
          ListFooterComponent={<AdBanner placement="goals" />}
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
  chips: { paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
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
  cardHeader: { justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
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
  cardMeta: { justifyContent: 'space-between', marginTop: spacing.sm },
  metaText: { ...typography.caption, color: colors.textMuted },
  overdue: { color: colors.error },
  empty: { ...typography.body, color: colors.textMuted, marginTop: spacing.xl },
  fab: {
    position: 'absolute',
    end: spacing.lg,
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
