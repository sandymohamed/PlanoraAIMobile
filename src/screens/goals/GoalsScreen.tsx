import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useGoalStore } from "@/store/goalStore";
import { Goal, GoalStatus } from "@/types/goal";
import { PlanoraColors, spacing, typography, radius } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { getApiErrorMessage } from "@/utils/apiError";
import {
  showError,
  showConfirmDialog,
  showActionSheet,
} from "@/components/ConfirmationDialog";
import { format, isAfter, differenceInDays } from "date-fns";
import { AdBanner } from "@/features/ads";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { AnalyticsEvents } from "@/analytics/posthog";
import { syncIfNeeded } from "@/services/sync/appSync";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // -----------------------------------------------------------------------
    // Header
    // -----------------------------------------------------------------------

    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },

    headerRow: {
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },

    title: {
      ...typography.h1,
      color: colors.text,
      flex: 1,
    },

    fab: {
      position: "absolute",
      end: spacing.lg,
      bottom: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
    },

    // -----------------------------------------------------------------------
    // Search
    // -----------------------------------------------------------------------

    searchWrapper: {
      position: "relative",
    },

    search: {
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingLeft: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      ...typography.body,
    },

    searchIcon: {
      position: "absolute",
      left: spacing.md,
      top: 14,
      zIndex: 1,
    },

    // -----------------------------------------------------------------------
    // Filters
    // -----------------------------------------------------------------------

    chips: {
      padding: spacing.xs,
      gap: spacing.sm,
      marginBottom: spacing.sm,
      height: 38,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },

    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    chipText: {
      ...typography.label,
      color: colors.textSecondary,
      // fontWeight: "600",
      fontSize: 11,
    },

    chipTextActive: {
      color: colors.background,
    },

    // -----------------------------------------------------------------------
    // List
    // -----------------------------------------------------------------------

    list: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: 100,
    },

    // -----------------------------------------------------------------------
    // Goal Card
    // -----------------------------------------------------------------------

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },

    cardTopRow: {
      alignItems: "flex-start",
      gap: spacing.sm,
    },

    cardTitleContainer: {
      flex: 1,
    },

    cardTitle: {
      ...typography.h3,
      color: colors.text,
      lineHeight: 23,
    },

    statusRow: {
      alignItems: "center",
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },

    badge: {
      ...typography.caption,
      fontWeight: "700",
    },

    menuButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -spacing.xs,
      marginEnd: -spacing.xs,
    },

    cardDesc: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      lineHeight: 20,
    },

    progressSection: {
      marginTop: spacing.md,
    },

    progressHeader: {
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },

    progressLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: "600",
    },

    progressPct: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: "700",
    },

    progressTrack: {
      height: 7,
      backgroundColor: colors.borderSubtle,
      borderRadius: 4,
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
    },

    metaRow: {
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.md,
      gap: spacing.sm,
    },

    metaItem: {
      flex: 1,
    },

    metaText: {
      ...typography.caption,
      color: colors.textMuted,
    },

    metaTextRight: {
      textAlign: "right",
    },

    overdue: {
      color: colors.error,
      fontWeight: "600",
    },

    // -----------------------------------------------------------------------
    // Section
    // -----------------------------------------------------------------------

    sectionLabel: {
      ...typography.label,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },

    // -----------------------------------------------------------------------
    // Empty state
    // -----------------------------------------------------------------------

    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },

    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.xs,
    },

    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 21,
    },

    emptyButton: {
      marginTop: spacing.lg,
      minHeight: 46,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.sm,
    },

    emptyButtonText: {
      ...typography.body,
      color: colors.background,
      fontWeight: "700",
    },

    // -----------------------------------------------------------------------
    // Loading
    // -----------------------------------------------------------------------

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });

const STATUS_FILTERS: {
  key: "all" | "active" | "completed";
  statuses?: GoalStatus[];
}[] = [
  {
    key: "all",
    statuses: undefined,
  },
  {
    key: "active",
    statuses: [GoalStatus.ACTIVE],
  },
  {
    key: "completed",
    statuses: [GoalStatus.DONE],
  },
];

export const GoalsScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();

  const isArabic = i18n.language.startsWith("ar");

  const textDir = {
    textAlign: isArabic ? "right" : "left",
    writingDirection: isArabic ? "rtl" : "ltr",
  } as const;

  const rowDir = {
    flexDirection: isArabic ? "row-reverse" : "row",
  } as const;

  useScreenAnalytics(AnalyticsEvents.GOALS_OPENED);

  // -------------------------------------------------------------------------
  // Store state
  // -------------------------------------------------------------------------

  const filteredGoals = useGoalStore((s) => s.filteredGoals);
  const isLoading = useGoalStore((s) => s.isLoading);
  const isLoaded = useGoalStore((s) => s.isLoaded);
  const searchQuery = useGoalStore((s) => s.searchQuery);
  const hasNextPage = useGoalStore((s) => s.hasNextPage);

  // -------------------------------------------------------------------------
  // Store actions
  // -------------------------------------------------------------------------

  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const loadMoreGoals = useGoalStore((s) => s.loadMoreGoals);
  const setSearchQuery = useGoalStore((s) => s.setSearchQuery);
  const clearFilters = useGoalStore((s) => s.clearFilters);
  const setStatusFilter = useGoalStore((s) => s.setStatusFilter);
  const applyFilters = useGoalStore((s) => s.applyFilters);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const completeGoal = useGoalStore((s) => s.completeGoal);

  // -------------------------------------------------------------------------
  // Local UI state
  // -------------------------------------------------------------------------

  const [viewMode, setViewMode] = useState<"all" | "active" | "completed">(
    "all",
  );

  const [refreshing, setRefreshing] = useState(false);

  const [localSearch, setLocalSearch] = useState(searchQuery);

  const [isInitialLoading, setIsInitialLoading] = useState(!isLoaded);

  // -------------------------------------------------------------------------
  // Initial loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded) {
      fetchGoals(1, 20)
        .catch(() => {})
        .finally(() => {
          setIsInitialLoading(false);
        });
    } else {
      setIsInitialLoading(false);

      const timer = setTimeout(() => {
        syncIfNeeded().catch(() => {});
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoaded, fetchGoals]);

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      clearFilters();
    };
  }, [clearFilters]);

  // -------------------------------------------------------------------------
  // Refresh
  // -------------------------------------------------------------------------

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await fetchGoals(1, 20, true);
    } catch (error) {
      console.error("Goals refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchGoals]);

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  const applyViewMode = useCallback(
    (mode: typeof viewMode) => {
      setViewMode(mode);

      const cfg = STATUS_FILTERS.find((f) => f.key === mode);

      setStatusFilter(cfg?.statuses ?? []);

      applyFilters();
    },
    [applyFilters, setStatusFilter],
  );

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  const onSearchSubmit = useCallback(() => {
    setSearchQuery(localSearch);
  }, [localSearch, setSearchQuery]);

  const onSearchChange = useCallback(
    (text: string) => {
      setLocalSearch(text);

      if (!text.trim() && searchQuery) {
        setSearchQuery("");
      }
    },
    [searchQuery, setSearchQuery],
  );

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  const onGoalPress = useCallback(
    (goal: Goal) => {
      navigation.navigate("GoalDetail", {
        goalId: goal.id,
      });
    },
    [navigation],
  );

  const createGoal = useCallback(() => {
    navigation.navigate("GoalCreate");
  }, [navigation]);

  // -------------------------------------------------------------------------
  // Goal actions
  // -------------------------------------------------------------------------

  const onGoalActions = useCallback(
    (goal: Goal) => {
      const options: {
        label: string;
        icon?: string;
        destructive?: boolean;
        onPress: () => void | Promise<void>;
      }[] = [];

      if (goal.status === GoalStatus.ACTIVE) {
        options.push({
          label: t("goals.actions.complete"),
          icon: "check-circle-outline",
          onPress: async () => {
            try {
              await completeGoal(goal.id);
            } catch (e) {
              showError(t("common.error"), getApiErrorMessage(e));
            }
          },
        });
      }

      if (goal.status !== GoalStatus.DONE) {
        options.push({
          label: t("goals.actions.edit"),
          icon: "pencil-outline",
          onPress: () =>
            navigation.navigate("GoalEdit", {
              goalId: goal.id,
            }),
        });
      }

      options.push({
        label: t("goals.actions.delete"),
        icon: "trash-can-outline",
        destructive: true,
        onPress: () =>
          showConfirmDialog({
            title: t("goals.actions.deleteTitle"),
            itemName: goal.title,
            confirmLabel: t("goals.actions.delete"),
            destructive: true,
            onConfirm: async () => {
              try {
                await deleteGoal(goal.id);
              } catch (e) {
                showError(t("common.error"), getApiErrorMessage(e));
              }
            },
          }),
      });

      showActionSheet({
        title: goal.title,
        options,
      });
    },
    [completeGoal, deleteGoal, navigation, t],
  );

  // -------------------------------------------------------------------------
  // Initial loading UI
  // -------------------------------------------------------------------------

  if (isInitialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  const hasSearch = localSearch.trim().length > 0;

  const getEmptyContent = () => {
    if (hasSearch) {
      return {
        icon: "magnify-close",
        title: t("goals.screen.noSearchResultsTitle", {
          defaultValue: "No goals found",
        }),
        body: t("goals.screen.noSearchResultsBody", {
          defaultValue: "Try a different search or clear your search.",
        }),
        showButton: false,
      };
    }

    if (viewMode === "active") {
      return {
        icon: "target",
        title: t("goals.screen.noActiveGoalsTitle", {
          defaultValue: "No active goals",
        }),
        body: t("goals.screen.noActiveGoalsBody", {
          defaultValue:
            "Create a goal to give your work a clear direction and track your progress.",
        }),
        showButton: true,
      };
    }

    if (viewMode === "completed") {
      return {
        icon: "check-circle-outline",
        title: t("goals.screen.noCompletedGoalsTitle", {
          defaultValue: "No completed goals yet",
        }),
        body: t("goals.screen.noCompletedGoalsBody", {
          defaultValue:
            "Your completed goals will appear here when you reach them.",
        }),
        showButton: false,
      };
    }

    return {
      icon: "target",
      title: t("goals.screen.emptyTitle", {
        defaultValue: "No goals yet",
      }),
      body: t("goals.screen.emptyBody", {
        defaultValue:
          "Start with something you want to achieve and turn it into real progress.",
      }),
      showButton: true,
    };
  };

  const emptyContent = getEmptyContent();

  // -------------------------------------------------------------------------
  // Goal card
  // -------------------------------------------------------------------------

  const renderGoal = ({ item }: { item: Goal }) => {
    const progress = Math.max(0, Math.min(100, Math.round(item.progress || 0)));

    const overdue =
      item.targetDate &&
      item.status !== GoalStatus.DONE &&
      isAfter(new Date(), new Date(item.targetDate));

    const daysLeft = item.targetDate
      ? differenceInDays(new Date(item.targetDate), new Date())
      : null;

    const statusColor = getStatusColor(item.status, colors);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onGoalPress(item)}
        activeOpacity={0.88}
      >
        {/* Status + title + menu */}

        <View style={[styles.cardTopRow, rowDir]}>
          <View style={styles.cardTitleContainer}>
            <View style={[styles.statusRow, rowDir]}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: statusColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.badge,
                  {
                    color: statusColor,
                  },
                ]}
              >
                {t(`goals.status.${item.status}`)}
              </Text>
            </View>

            <Text style={[styles.cardTitle, textDir]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => onGoalActions(item)}
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
            activeOpacity={0.7}
          >
            <Icon name="dots-vertical" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Description */}

        {item.description ? (
          <Text style={[styles.cardDesc, textDir]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Progress */}

        <View style={styles.progressSection}>
          <View style={[styles.progressHeader, rowDir]}>
            <Text style={[styles.progressLabel, textDir]}>
              {t("goals.screen.progress", {
                defaultValue: "Progress",
              })}
            </Text>

            <Text style={[styles.progressPct, textDir]}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Meta */}

        <View style={[styles.metaRow, rowDir]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaText, textDir]}>
              {t(`goals.categories.${item.category}`, {
                defaultValue: item.category,
              })}
            </Text>
          </View>

          {item.targetDate ? (
            <View style={styles.metaItem}>
              <Text
                style={[
                  styles.metaText,
                  isArabic ? styles.metaText : styles.metaTextRight,
                  overdue && styles.overdue,
                  textDir,
                ]}
              >
                {overdue
                  ? t("goals.screen.overdue")
                  : daysLeft !== null && daysLeft >= 0
                    ? t("goals.screen.daysLeft", {
                        count: daysLeft,
                      })
                    : format(new Date(item.targetDate), "MMM d")}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <View style={[styles.headerRow, rowDir]}>
          <Text style={[styles.title, textDir]}>{t("navigation.goals")}</Text>
        </View>

        {/* Search */}

        <View style={styles.searchWrapper}>
          <Icon
            name="magnify"
            size={21}
            color={colors.textMuted}
            style={[
              styles.searchIcon,
              {
                left: isArabic ? undefined : spacing.md,
                right: isArabic ? spacing.md : undefined,
              },
            ]}
          />

          <TextInput
            style={[
              styles.search,
              {
                paddingLeft: isArabic ? spacing.md : 44,
                paddingRight: isArabic ? 44 : spacing.md,
              },
              textDir,
            ]}
            placeholder={t("goals.screen.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={localSearch}
            onChangeText={onSearchChange}
            onSubmitEditing={onSearchSubmit}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Filters */}

      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chips, rowDir]}
        renderItem={({ item: filter }) => (
          <TouchableOpacity
            style={[styles.chip, viewMode === filter.key && styles.chipActive]}
            onPress={() => applyViewMode(filter.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.chipText,
                viewMode === filter.key && styles.chipTextActive,
              ]}
            >
              {t(`goals.filter.${filter.key}`)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Goals */}

      <FlatList
        data={filteredGoals}
        keyExtractor={(g) => g.id}
        renderItem={renderGoal}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isLoading) {
            loadMoreGoals();
          }
        }}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          filteredGoals.length > 0 ? (
            <Text style={[styles.sectionLabel, textDir]}>
              {viewMode === "all"
                ? t("goals.screen.yourGoals", {
                    defaultValue: "Your goals",
                  })
                : viewMode === "active"
                  ? t("goals.screen.activeGoals", {
                      defaultValue: "Active goals",
                    })
                  : t("goals.screen.completedGoals", {
                      defaultValue: "Completed goals",
                    })}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Icon name={emptyContent.icon} size={30} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>{emptyContent.title}</Text>

            <Text style={styles.emptyText}>{emptyContent.body}</Text>

            {emptyContent.showButton ? (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={createGoal}
                activeOpacity={0.85}
              >
                <Icon name="plus" size={19} color={colors.background} />

                <Text style={styles.emptyButtonText}>
                  {t("goals.screen.createGoal", {
                    defaultValue: "Create Goal",
                  })}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListFooterComponent={<AdBanner placement="goals" />}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={createGoal}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("goals.screen.createGoal", {
          defaultValue: "Create goal",
        })}
      >
        <Icon name="plus" size={24} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// STATUS COLOR
// ============================================================================

function getStatusColor(status: GoalStatus, colors: PlanoraColors) {
  switch (status) {
    case GoalStatus.DONE:
      return colors.success;

    case GoalStatus.PAUSED:
      return colors.warning;

    case GoalStatus.CANCELLED:
      return colors.textMuted;

    case GoalStatus.DRAFT:
      return colors.textSecondary;

    case GoalStatus.ACTIVE:
    default:
      return colors.primary;
  }
}
