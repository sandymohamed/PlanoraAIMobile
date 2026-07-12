import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format, isSameDay, startOfDay, subDays } from "date-fns";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { Goal } from "@/types/goal";
import { Task, TaskStatus } from "@/types/task";
import { Routine } from "@/types/routine";
import { Card } from "@/components/ui/Card";
import { colors, spacing, typography, radius } from "@/theme/tokens";
import { track, AnalyticsEvents } from "@/analytics/posthog";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { setPendingAnalyticsContext } from "@/analytics/pendingContext";
import { AdBanner } from "@/features/ads";
import { PremiumLabel } from "@/components/premium/PremiumBadge";

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { i18n } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const completeTask = useTaskStore((s) => s.completeTask);
  const uncompleteTask = useTaskStore((s) => s.uncompleteTask);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useScreenAnalytics(AnalyticsEvents.HOME_OPENED);

  const load = useCallback(async () => {
    await fetchTasks();
    try {
      const [r, gRes] = await Promise.all([
        routineService.getUserRoutines(),
        goalService.getGoals({ limit: 5 }),
      ]);
      setRoutines(r.filter((x) => x.enabled).slice(0, 3));
      setGoals((gRes.data || []).slice(0, 3));
    } catch {
      /* keep partial data */
    }
  }, [fetchTasks]);

  useEffect(() => {
    load();
  }, [load]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("home.goodMorning");
    if (h < 17) return t("home.goodAfternoon");
    return t("home.goodEvening");
  }, [t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const todayTasks = useMemo(() => {
    const today = new Date();
    return tasks
      .filter(
        (t) =>
          t.dueDate &&
          isSameDay(new Date(t.dueDate), today) &&
          !t.metadata?.isRoutineTask,
      )
      .slice(0, 5);
  }, [tasks]);

  const streakStats = useMemo(
    () => calculateCompletionStreak(tasks, t),
    [tasks, t],
  );

  const toggleTaskComplete = useCallback(
    async (task: Task) => {
      setPendingAnalyticsContext({ taskCompleteSource: "today" });
      if (task.status === TaskStatus.DONE) await uncompleteTask(task.id);
      else await completeTask(task.id);
    },
    [completeTask, uncompleteTask],
  );

  const navigateToGoals = useCallback(() => {
    track(AnalyticsEvents.AI_PLANNER_OPENED, { source: "home" });
    navigation.navigate("Goals");
  }, [navigation]);

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
    () => navigation.navigate("Tasks", { screen: "TasksList" }),
    [navigation],
  );
  const navigateToTaskDetail = useCallback(
    (taskId: string) => {
      navigation.navigate("Tasks", {
        screen: "TaskDetail",
        params: { taskId },
      });
    },
    [navigation],
  );


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
    >
      <Text style={[styles.greeting, ]}>
        {greeting}
        {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
      </Text>

      <Text
        style={[
          styles.sub,
          // ,
         
        ]}
      >
        {t("home.todayReady")}
      </Text>

      {/* Today's focus */}
      <Card elevated style={styles.focusCard}>
        <Text style={[styles.sectionLabel, ]}>
          {t("home.todaysFocusLabel")}
        </Text>
        <Text style={[styles.focusTitle, ]}>
          {t("home.focusTitle")}
        </Text>
        <Text style={[styles.focusMeta, ]}>{t("home.focusMeta")}</Text>
      </Card>

      {/* AI suggestion */}
      <TouchableOpacity onPress={navigateToGoals}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.aiCard, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}
        >
          <Icon name="star-shooting-outline" size={28} color="#fff" />
          <View style={styles.aiText}>
            <PremiumLabel requiredPlan="pro" >
              <Text style={styles.aiTitle}>{t("home.aiPlanner")}</Text>
            </PremiumLabel>
            <Text style={styles.aiBody}>{t("home.aiPlannerBody")}</Text>
          </View>
          <Icon
            name={i18n.language === 'ar' ? 'chevron-left' : 'chevron-right'}
            size={24}
            color="rgba(255,255,255,0.8)"
          />
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick actions row */}
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
          label={t("navigation.routines")}
          onPress={navigateToRoutines}
        />
        <QuickAction
          icon="chart-timeline-variant"
          label={t("home.weekly")}
          onPress={navigateToWeeklyReview}
        />
      </View>

      {/* Today's tasks preview */}
      <SectionHeader
        title={t("home.todaysTasks")}
        action={t("home.seeAll")}
        onAction={navigateToTasks}
      />
      <Card>
        {todayTasks.length === 0 ? (
          <Text style={styles.focusMeta}>{t("home.noTasksToday")}</Text>
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
                } catch (e) {
                  showError(t("common.error"), getApiErrorMessage(e));
                  throw e;
                }
              }}
            />
          ))
        )}
      </Card>

      {/* Active routines */}
      <SectionHeader
        title={t("home.activeRoutines")}
        action={t("home.manage")}
        onAction={navigateToRoutines}
      />
      <Card>
        {routines.length === 0 ? (
          <Text style={styles.focusMeta}>{t("home.noActiveRoutines")}</Text>
        ) : (
          routines.map((r) => (
            <RoutineRow
              key={r.id}
              name={r.title}
              streak={r.routineTasks?.filter((t) => t.completed).length || 0}
            />
          ))
        )}
      </Card>

      {/* Goal progress */}
      <SectionHeader
        title={t("home.goalProgress")}
        action={t("navigation.goals")}
        onAction={navigateToGoals}
      />
      <Card>
        {goals.length === 0 ? (
          <Text style={styles.focusMeta}>{t("home.noGoals")}</Text>
        ) : (
          goals.map((g) => (
            <ProgressBar
              key={g.id}
              label={g.title}
              progress={Math.round(g.progress || 0)}
            />
          ))
        )}
      </Card>

      {/* Streak */}
      <Card style={styles.streakCard}>
        <Icon name="fire" size={32} color={colors.warning} />
        <View>
          <Text style={styles.streakNum}>
            {t("home.dayStreak", { count: streakStats.currentStreak })}
          </Text>
          <Text style={styles.streakMeta}>{streakStats.message}</Text>
        </View>
      </Card>

      <AdBanner placement="home" />
    </ScrollView>
  );
};

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

function calculateCompletionStreak(tasks: Task[], t: TFunction) {
  const completedDayKeys = new Set<string>();

  tasks.forEach((task) => {
    if (task.metadata?.isRoutineTask) return;
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
      ? t("home.activeDaysThisWeek", { completed: weeklyCompletedDays })
      : t("home.startStreak");

  return { currentStreak, weeklyCompletedDays, message };
}

const QuickAction: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
}> = React.memo(({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress}>
    <View style={styles.quickIcon}>
      <Icon name={icon} size={22} color={colors.primary} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
));

const SectionHeader: React.FC<{
  title: string;
  action: string;
  onAction: () => void;
}> = React.memo(({ title, action, onAction }) => {
    const { i18n } = useTranslation();
  
  return (
    <View style={[styles.sectionHeader, {flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.sectionTitle, ]}>{title} </Text>
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
});

const RoutineRow: React.FC<{ name: string; streak: number }> = React.memo(
  ({ name, streak }) => {
     return (
      <View style={styles.taskRow}>
        <Icon name="repeat" size={20} color={colors.accent} />
        <Text style={[styles.taskTitle, ]}>{name}</Text>
        <Text style={styles.streakBadge}>{streak}d</Text>
      </View>
    );
  },
);

const ProgressBar: React.FC<{ label: string; progress: number }> = React.memo(
  ({ label, progress }) => {
     return (
      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={[styles.taskTitle, ]}>{label}</Text>
          <Text style={styles.progressPct}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  greeting: { ...typography.hero, color: colors.text },
  sub: {
    ...typography.body,
    width: "100%",
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  focusCard: { marginBottom: spacing.md },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  focusTitle: { ...typography.h2, color: colors.text },
  focusMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  aiText: { flex: 1 },
  aiTitle: { ...typography.h3, color: "#fff" },
  aiBody: {
    ...typography.caption,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  quickRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  quickItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  quickLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    fontSize: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionAction: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  taskTitle: { ...typography.body, color: colors.text, flex: 1 },
  streakBadge: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  progressWrap: { marginBottom: spacing.md },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressPct: { ...typography.caption, color: colors.primary },
  progressTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  streakNum: { ...typography.h3, color: colors.text },
  streakMeta: { ...typography.caption, color: colors.textSecondary },
});
