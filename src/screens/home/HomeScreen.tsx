import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { format, isSameDay, startOfDay, subDays } from "date-fns";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  InteractionManager,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { TaskListRow } from "@/components/tasks/TaskListRow";
import { showError } from "@/components/ConfirmationDialog";
import { getApiErrorMessage } from "@/utils/apiError";

import { routineService } from "@/services/routineService";
import { goalService } from "@/services/goalService";

import { Goal, GoalStatus } from "@/types/goal";
import { Task, TaskStatus } from "@/types/task";
import { Routine } from "@/types/routine";
import { MilestoneStatus } from "@/types/goal";

import { Card } from "@/components/ui/Card";
import { PlanoraColors, spacing, typography, radius } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

import { track, AnalyticsEvents } from "@/analytics/posthog";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { setPendingAnalyticsContext } from "@/analytics/pendingContext";

import { AdBanner } from "@/features/ads";

import { syncIfNeeded } from "@/services/sync/appSync";
import { alarmPermissionService } from "@/services/AlarmPermissionService";

import { useRTL } from "@/hooks/useRTL";
import { createStyles } from "./CreateStyle";

export const HomeScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();

  const user = useAuthStore((s) => s.user);

  const tasks = useTaskStore((s) => s.tasks);
  const isLoaded = useTaskStore((s) => s.isLoaded);

  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const completeTask = useTaskStore((s) => s.completeTask);
  const uncompleteTask = useTaskStore((s) => s.uncompleteTask);

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingRoutines, setIsLoadingRoutines] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  const loadRoutinesRef = useRef(false);
  const loadGoalsRef = useRef(false);

  const { navigateNext, directionalTextStyle: dirText } = useRTL();

  const isArabic = i18n.language.startsWith("ar");

  useScreenAnalytics(AnalyticsEvents.HOME_OPENED);

  // -------------------------------------------------------------------------
  // Greeting
  // -------------------------------------------------------------------------

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return t("home.goodMorning");
    if (hour < 17) return t("home.goodAfternoon");

    return t("home.goodEvening");
  }, [t]);

  // -------------------------------------------------------------------------
  // Load routines
  // -------------------------------------------------------------------------

  const loadRoutines = useCallback(async () => {
    if (loadRoutinesRef.current) return;

    loadRoutinesRef.current = true;

    try {
      setIsLoadingRoutines(true);

      const result = await routineService.getUserRoutines();

      setRoutines(result.filter((item) => item.enabled).slice(0, 3));
    } catch {
      // Keep existing data.
    } finally {
      setIsLoadingRoutines(false);
      loadRoutinesRef.current = false;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Load goals
  // -------------------------------------------------------------------------

  const loadGoals = useCallback(async () => {
    if (loadGoalsRef.current) return;

    loadGoalsRef.current = true;

    try {
      setIsLoadingGoals(true);

      const result = await goalService.getGoals({
        limit: 10,
      });

      setGoals(result.data || []);
    } catch {
      // Keep existing data.
    } finally {
      setIsLoadingGoals(false);
      loadGoalsRef.current = false;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Initial loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isLoaded) {
      fetchTasks().catch(() => {});
    }

    const task = InteractionManager.runAfterInteractions(() => {
      loadRoutines();
      loadGoals();
    });

    return () => task.cancel();
  }, [isLoaded, fetchTasks, loadRoutines, loadGoals]);

  // -------------------------------------------------------------------------
  // Sync
  // -------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      const taskStore = useTaskStore.getState();

      const needsRefresh = taskStore.needsRefresh && taskStore.needsRefresh();

      if (needsRefresh) {
        const timer = setTimeout(() => {
          syncIfNeeded().catch(() => {});
        }, 500);

        return () => clearTimeout(timer);
      }
    }, []),
  );

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  const [permissionsGranted, setPermissionsGranted] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const checkPermissions = async () => {
        const permissions = await alarmPermissionService.checkAllPermissions();

        setPermissionsGranted(permissions.allGranted);
      };

      checkPermissions().catch(() => {});
    }, []),
  );

  // -------------------------------------------------------------------------
  // Refresh
  // -------------------------------------------------------------------------

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    loadRoutinesRef.current = false;
    loadGoalsRef.current = false;

    try {
      await fetchTasks();

      await Promise.all([loadRoutines(), loadGoals()]);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchTasks, loadRoutines, loadGoals]);

  // -------------------------------------------------------------------------
  // Today's tasks
  // -------------------------------------------------------------------------

  const todayTasks = useMemo(() => {
    const today = new Date();

    return tasks
      .filter(
        (task) =>
          task.dueDate &&
          isSameDay(new Date(task.dueDate), today) &&
          !task.metadata?.isRoutineTask &&
          task.status !== TaskStatus.DONE &&
          !task.isDeleted,
      )
      .slice(0, 5);
  }, [tasks]);

  // -------------------------------------------------------------------------
  // Completed tasks / streak
  // -------------------------------------------------------------------------

  const completedTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        task.status === TaskStatus.DONE &&
        !task.metadata?.isRoutineTask &&
        !task.isDeleted,
    );
  }, [tasks]);

  const streakStats = useMemo(
    () => calculateCompletionStreak(completedTasks, t),
    [completedTasks, t],
  );

  // -------------------------------------------------------------------------
  // User state
  // -------------------------------------------------------------------------

  const isNewUser = useMemo(() => {
    const hasGoals = goals.length > 0;

    const hasRealTasks = tasks.some(
      (task) => !task.metadata?.isRoutineTask && !task.isDeleted,
    );

    return !hasGoals && !hasRealTasks;
  }, [goals, tasks]);

  // -------------------------------------------------------------------------
  // ACTIVE GOAL
  // -------------------------------------------------------------------------
  const [activeGoalTargetDate, setActiveGoalTargetDate] = useState<
    Date  | null
  >(null);

  const activeGoal = useMemo(() => {
    return (
      goals.find(
        (goal) => !goal.isDeleted && goal.status === GoalStatus.ACTIVE,
      ) || null
    );
  }, [goals]);

  useEffect(() => {
    setActiveGoalTargetDate(
      activeGoal?.targetDate ? new Date(activeGoal.targetDate) : null,
    );
  }, [activeGoal]);

  // -------------------------------------------------------------------------
  // CURRENT MILESTONE
  // -------------------------------------------------------------------------

  // const currentMilestone = useMemo(() => {
  //   if (!activeGoal?.milestones?.length) {
  //     return null;
  //   }

  //   return (
  //     activeGoal.milestones.sort((a, b) => {
  //       /**
  //        * If data somehow contains more than one milestone,
  //        * prefer the one with the lowest order.
  //        */
  //       return (a.order ?? 0) - (b.order ?? 0);
  //     })[0] || null
  //   );
  // }, [activeGoal]);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  /**
   * This is the ONLY primary CTA for creating a goal.
   * The user creates the goal first, then can open Goal Details and
   * generate an AI plan there.
   */
  const navigateToGoals = useCallback(() => {
    navigation.navigate("Goals");
  }, [navigation]);

  const navigateToGoalDetail = useCallback(
    (goalId: string) => {
      navigation.navigate("Goals", {
        screen: "GoalDetail",
        params: {
          goalId,
        },
      });
    },
    [navigation],
  );

  const navigateToFocus = useCallback(
    () => navigation.navigate("Focus"),
    [navigation],
  );

  const navigateToAlarms = useCallback(
    () => navigation.navigate("Alarms"),
    [navigation],
  );

  const navigateToRoutines = useCallback(
    () => navigation.navigate("Routines"),
    [navigation],
  );

  const navigateToWeeklyReview = useCallback(
    () => navigation.navigate("WeeklyReview"),
    [navigation],
  );

  const navigateToTasks = useCallback(
    () =>
      navigation.navigate("Tasks", {
        screen: "TasksList",
      }),
    [navigation],
  );

  const navigateToTaskDetail = useCallback(
    (taskId: string) => {
      navigation.navigate("Tasks", {
        screen: "TaskDetail",
        params: {
          taskId,
        },
      });
    },
    [navigation],
  );

  const navigateToCalendar = useCallback(
    () => navigation.navigate("Calendar"),
    [navigation],
  );

  // -------------------------------------------------------------------------
  // Complete / uncomplete task
  // -------------------------------------------------------------------------

  const toggleTaskComplete = useCallback(
    async (task: Task) => {
      setPendingAnalyticsContext({
        taskCompleteSource: "today",
      });

      if (task.status === TaskStatus.DONE) {
        await uncompleteTask(task.id);
      } else {
        await completeTask(task.id);
      }
    },
    [completeTask, uncompleteTask],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ================================================================
          HEADER
      ================================================================= */}

      <Text style={[styles.greeting, dirText()]}>
        {greeting}
        {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
      </Text>

      <Text style={[styles.sub, dirText()]}>
        {isNewUser ? t("home.getStartedSubtitle") : t("home.todayReady")}
      </Text>

      {/* ================================================================
          PERMISSION BANNER
      ================================================================= */}

      {!permissionsGranted && (
        <TouchableOpacity
          style={[
            styles.permBanner,
            {
              flexDirection: isArabic ? "row-reverse" : "row",
            },
          ]}
          onPress={() => alarmPermissionService.requestAllPermissions()}
          activeOpacity={0.8}
        >
          <Icon name="shield-check-outline" size={18} color={colors.primary} />

          <View style={styles.permBody}>
            <Text
              style={[
                styles.permText,
                {
                  textAlign: isArabic ? "right" : "left",
                  writingDirection: isArabic ? "rtl" : "ltr",
                },
              ]}
            >
              {t("alarms.verifyPermissions")}
            </Text>

            <Text
              style={[
                styles.permSub,
                {
                  textAlign: isArabic ? "right" : "left",
                  writingDirection: isArabic ? "rtl" : "ltr",
                },
              ]}
            >
              {t("alarms.verifyPermissionsDesc")}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ================================================================
          NEW USER
      ================================================================= */}

      {isNewUser ? (
        <>
          <Card style={styles.welcomeCard}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeGradient}
            >
              <View style={styles.welcomeIcon}>
                <Icon name="target" size={26} color="#fff" />
              </View>

              <Text
                style={[
                  styles.welcomeTitle,
                  {
                    textAlign: isArabic ? "right" : "left",
                  },
                ]}
              >
                {t("home.getStartedTitle")}
              </Text>

              <Text
                style={[
                  styles.welcomeBody,
                  {
                    textAlign: isArabic ? "right" : "left",
                  },
                ]}
              >
                {t("home.getStartedBody")}
              </Text>

              {/* --------------------------------------------------------
                  ONE CTA ONLY
              --------------------------------------------------------- */}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={navigateToGoals}
                activeOpacity={0.85}
              >
                <Icon name="plus" size={21} color={colors.primary} />

                <Text style={styles.primaryButtonText}>
                  {t("home.createGoal", {
                    defaultValue: "Create a Goal",
                  })}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Card>

          {/* ============================================================
              PRODUCT EXPLANATION
          ============================================================ */}

          <Text style={[styles.exploreTitle, dirText()]}>
            {t("home.howPlanoraHelps")}
          </Text>

          <Text style={[styles.exploreSubtitle, dirText()]}>
            {t("home.howPlanoraHelpsBody")}
          </Text>

          <View
            style={[
              styles.featureGrid,
              {
                flexDirection: isArabic ? "row-reverse" : "row",
              },
            ]}
          >
            <FeatureCard
              icon="target"
              title={t("home.featureGoalsTitle")}
              body={t("home.featureGoalsBody")}
              onPress={navigateToGoals}
            />

            <FeatureCard
              icon="check-circle-outline"
              title={t("home.featureTasksTitle")}
              body={t("home.featureTasksBody")}
              onPress={navigateToTasks}
            />

            <FeatureCard
              icon="repeat"
              title={t("home.featureHabitsTitle")}
              body={t("home.featureHabitsBody")}
              onPress={navigateToRoutines}
            />

            <FeatureCard
              icon="calendar-month-outline"
              title={t("home.featureCalendarTitle")}
              body={t("home.featureCalendarBody")}
              onPress={navigateToCalendar}
            />
          </View>
        </>
      ) : (
        <>
          {/* ============================================================
              EXISTING USER DASHBOARD
          ============================================================ */}

          {/* ============================================================
              ACTIVE GOAL
          ============================================================ */}

          {isLoadingGoals ? (
            <Card style={styles.activeGoalCard}>
              <Text style={[styles.loadingText, dirText()]}>
                {t("home.loading")}
              </Text>
            </Card>
          ) : activeGoal ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigateToGoalDetail(activeGoal.id)}
            >
              <Card elevated style={styles.activeGoalCard}>
                <Text style={styles.sectionLabel}>{t("home.activeGoal")}</Text>

                <View
                  style={[
                    styles.activeGoalHeader,
                    {
                      flexDirection: isArabic ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.activeGoalTitle,
                      {
                        textAlign: isArabic ? "right" : "left",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {activeGoal.title}
                  </Text>

                  <Icon
                    name={isArabic ? "chevron-left" : "chevron-right"}
                    size={24}
                    color={colors.textMuted}
                    style={styles.goalArrow}
                  />
                </View>

                {/* {activeGoal.targetDate && (
                  <Text style={[styles.goalMeta, dirText()]}>
                    {t("home.goalTargetDate", {
                      defaultValue: "Target: {{date}}",
                      date: format(
                        new Date(activeGoal.targetDate),
                        "MMM d, yyyy",
                      ),
                    })}
                  </Text>
                )} */}

                {/* ------------------------------------------------------
                    GOAL PROGRESS
                ------------------------------------------------------- */}

                <View style={styles.progressWrap}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      {t("home.goalProgress", {
                        defaultValue: "Progress",
                      })}
                    </Text>

                    <Text style={styles.progressPct}>
                      {Math.round(
                        Math.max(0, Math.min(100, activeGoal.progress || 0)),
                      )}
                      %
                    </Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(
                            0,
                            Math.min(100, activeGoal.progress || 0),
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* ------------------------------------------------------
                    CURRENT MILESTONE
                ------------------------------------------------------- */}
{/* 
                {currentMilestone && (
                  <View
                    style={[
                      styles.milestoneCard,
                      {
                        alignItems: "stretch",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.milestoneHeader,
                        {
                          flexDirection: isArabic ? "row-reverse" : "row",
                        },
                      ]}
                    >
                      <Icon
                        name="flag-checkered"
                        size={17}
                        color={colors.primary}
                      />

                      <Text
                        style={[
                          styles.milestoneLabel,
                          {
                            marginLeft: isArabic ? 0 : spacing.xs,
                            marginRight: isArabic ? spacing.xs : 0,
                            textAlign: isArabic ? "right" : "left",
                          },
                        ]}
                      >
                        {t("home.currentMilestone", {
                          defaultValue: "Current milestone",
                        })}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.milestoneTitle,
                        {
                          textAlign: isArabic ? "right" : "left",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {currentMilestone.title}
                    </Text>

                    {currentMilestone.description && (
                      <Text
                        style={[
                          styles.milestoneDescription,
                          {
                            textAlign: isArabic ? "right" : "left",
                          },
                        ]}
                        numberOfLines={3}
                      >
                        {currentMilestone.description}
                      </Text>
                    )}

                    {currentMilestone.targetDate && (
                      <Text
                        style={[
                          styles.milestoneDate,
                          {
                            textAlign: isArabic ? "right" : "left",
                          },
                        ]}
                      >
                        {t("home.milestoneTargetDate", {
                          defaultValue: "Target: {{date}}",
                          date: format(
                            new Date(currentMilestone.targetDate),
                            "MMM d, yyyy",
                          ),
                        })}
                      </Text>
                    )}
                  </View>
                )} */}
              </Card>
            </TouchableOpacity>
          ) : (
            /* ============================================================
               NO ACTIVE GOAL
            ============================================================ */

            <Card style={styles.noGoalCard}>
              <View style={styles.noGoalIcon}>
                <Icon name="target" size={24} color={colors.primary} />
              </View>

              <Text
                style={[
                  styles.noGoalTitle,
                  {
                    textAlign: isArabic ? "right" : "left",
                  },
                ]}
              >
                {t("home.noActiveGoalTitle", {
                  defaultValue: "Ready for your next goal?",
                })}
              </Text>

              <Text
                style={[
                  styles.noGoalBody,
                  {
                    textAlign: isArabic ? "right" : "left",
                  },
                ]}
              >
                {t("home.noActiveGoalBody", {
                  defaultValue:
                    "Create a goal to give your work a clear direction and track your progress.",
                })}
              </Text>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={navigateToGoals}
                activeOpacity={0.8}
              >
                <Icon name="plus" size={19} color={colors.primary} />

                <Text style={styles.secondaryButtonText}>
                  {t("home.createGoal", {
                    defaultValue: "Create a Goal",
                  })}
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* ============================================================
              TODAY'S EXECUTION
          ============================================================ */}

          <Card elevated style={styles.focusCard}>
            <Text style={styles.sectionLabel}>
              {t("home.todaysFocusLabel")}
            </Text>

            <Text style={[styles.focusTitle, dirText()]}>
              {todayTasks.length > 0
                ? `${todayTasks.length} ${t("home.todaysTasks")}`
                : t("home.noTasksToday")}
            </Text>

            <Text style={[styles.focusMeta, dirText()]}>
              {todayTasks.length > 0
                ? t("home.focusMeta")
                : t("home.relaxAndPlan")}
            </Text>
          </Card>

          {/* ============================================================
              SUPPORTING EXECUTION TOOLS
          ============================================================ */}

          <View style={styles.quickRow}>
            <QuickAction
              icon="timer-outline"
              label={t("home.focus")}
              onPress={navigateToFocus}
            />

            <QuickAction
              icon="alarm"
              label={t("navigation.alarms")}
              onPress={navigateToAlarms}
            />

            <QuickAction
              icon="repeat"
              label={t("navigation.routines", {
                defaultValue: "Habits",
              })}
              onPress={navigateToRoutines}
            />

            <QuickAction
              icon="chart-timeline-variant"
              label={t("home.weekly")}
              onPress={navigateToWeeklyReview}
            />
          </View>

          {/* ============================================================
              TODAY'S TASKS
          ============================================================ */}

          <SectionHeader
            title={t("home.todaysTasks")}
            action={t("home.seeAll")}
            onAction={navigateToTasks}
          />

          <Card>
            {todayTasks.length === 0 ? (
              <Text style={[styles.emptyText, dirText()]}>
                {t("home.noTasksToday")}
              </Text>
            ) : (
              todayTasks.map((task) => (
                <TaskListRow
                  key={task.id}
                  task={task}
                  compact
                  dismissOnComplete={false}
                  onPress={() => navigateToTaskDetail(task.id)}
                  onToggleComplete={async () => {
                    try {
                      await toggleTaskComplete(task);
                    } catch (error) {
                      showError(t("common.error"), getApiErrorMessage(error));

                      throw error;
                    }
                  }}
                />
              ))
            )}
          </Card>

          {/* ============================================================
              HABITS
          ============================================================ */}

          <SectionHeader
            title={t("home.activeRoutines", {
              defaultValue: "Active Habits",
            })}
            action={t("home.manage")}
            onAction={navigateToRoutines}
          />

          <Card>
            {isLoadingRoutines ? (
              <Text style={[styles.loadingText, dirText()]}>
                {t("home.loading")}
              </Text>
            ) : routines.length === 0 ? (
              <Text style={[styles.emptyText, dirText()]}>
                {t("home.noActiveRoutines", {
                  defaultValue: "No active habits yet.",
                })}
              </Text>
            ) : (
              routines.map((routine) => (
                <RoutineRow
                  key={routine.id}
                  name={routine.title}
                  streak={
                    routine.routineTasks?.filter((task) => task.completed)
                      .length || 0
                  }
                />
              ))
            )}
          </Card>

          {/* ============================================================
              STREAK
          ============================================================ */}

          <Card style={styles.streakCard}>
            <Icon name="fire" size={32} color={colors.warning} />

            <View>
              <Text style={[styles.streakNum, dirText()]}>
                {t("home.dayStreak", {
                  count: streakStats.currentStreak,
                })}
              </Text>

              <Text style={[styles.streakMeta, dirText()]}>
                {streakStats.message}
              </Text>
            </View>
          </Card>
        </>
      )}

      <AdBanner placement="home" />
    </ScrollView>
  );
};

// ============================================================================
// FEATURE CARD
// ============================================================================

const FeatureCard: React.FC<{
  icon: string;
  title: string;
  body: string;
  onPress?: () => void;
}> = React.memo(({ icon, title, body, onPress }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const content = (
    <>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={21} color={colors.primary} />
      </View>

      <Text style={styles.featureTitle}>{title}</Text>

      <Text style={styles.featureBody} numberOfLines={3}>
        {body}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.featureCard}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {content}
    </TouchableOpacity>
  );
});

FeatureCard.displayName = "FeatureCard";

// ============================================================================
// QUICK ACTION
// ============================================================================

const QuickAction: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
}> = React.memo(({ icon, label, onPress }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <TouchableOpacity
      style={styles.quickItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.quickIcon}>
        <Icon name={icon} size={21} color={colors.primary} />
      </View>

      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
});

QuickAction.displayName = "QuickAction";

// ============================================================================
// SECTION HEADER
// ============================================================================

const SectionHeader: React.FC<{
  title: string;
  action: string;
  onAction: () => void;
}> = React.memo(({ title, action, onAction }) => {
  const { i18n } = useTranslation();

  const { styles } = usePlanoraStyles(createStyles);

  const isArabic = i18n.language.startsWith("ar");

  return (
    <View
      style={[
        styles.sectionHeader,
        {
          flexDirection: isArabic ? "row-reverse" : "row",
        },
      ]}
    >
      <Text
        style={[
          styles.sectionTitle,
          {
            textAlign: isArabic ? "right" : "left",
          },
        ]}
      >
        {title}
      </Text>

      <TouchableOpacity
        onPress={onAction}
        hitSlop={{
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
        }}
      >
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
});

SectionHeader.displayName = "SectionHeader";

// ============================================================================
// ROUTINE / HABIT ROW
// ============================================================================

const RoutineRow: React.FC<{
  name: string;
  streak: number;
}> = React.memo(({ name, streak }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <View style={styles.taskRow}>
      <Icon name="repeat" size={20} color={colors.accent} />

      <Text style={styles.taskTitle} numberOfLines={1}>
        {name}
      </Text>

      <Text style={styles.streakBadge}>{streak}d</Text>
    </View>
  );
});

RoutineRow.displayName = "RoutineRow";

// ============================================================================
// DATE / STREAK HELPERS
// ============================================================================

function dayKey(date: Date) {
  return format(startOfDay(date), "yyyy-MM-dd");
}

function getTaskCompletionDate(task: Task): Date | null {
  if (task.status !== TaskStatus.DONE || task.isDeleted) {
    return null;
  }

  const rawDate = task.completedAt || task.updatedAt;

  if (!rawDate) return null;

  const date = new Date(rawDate);

  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateCompletionStreak(completedTasks: Task[], t: TFunction) {
  const completedDayKeys = new Set<string>();

  completedTasks.forEach((task) => {
    const completedAt = getTaskCompletionDate(task);

    if (completedAt) {
      completedDayKeys.add(dayKey(completedAt));
    }
  });

  const today = startOfDay(new Date());

  const startDay = completedDayKeys.has(dayKey(today))
    ? today
    : startOfDay(subDays(today, 1));

  let currentStreak = 0;
  let cursor = startDay;

  while (completedDayKeys.has(dayKey(cursor))) {
    currentStreak += 1;

    cursor = startOfDay(subDays(cursor, 1));
  }

  const weeklyCompletedDays = Array.from({ length: 7 }, (_, index) =>
    dayKey(subDays(today, index)),
  ).filter((key) => completedDayKeys.has(key)).length;

  const message =
    currentStreak > 0
      ? t("home.activeDaysThisWeek", {
          completed: weeklyCompletedDays,
        })
      : t("home.startStreak");

  return {
    currentStreak,
    weeklyCompletedDays,
    message,
  };
}
