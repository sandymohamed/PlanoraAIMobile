import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { routineService } from "@/services/routineService";
import { useAlarmStore } from "@/store/alarmStore";
import { useTaskStore } from "@/store/taskStore";
import { Routine } from "@/types/routine";
import { RoutinesStackParamList } from "@/navigation/RoutinesStack";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { getApiErrorMessage } from "@/utils/apiError";
import { showError, showConfirmDialog } from "@/components/ConfirmationDialog";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { AnalyticsEvents } from "@/analytics/posthog";
import formatTime from "@/utils/formatTime";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: {
      ...typography.h1,
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    sub: {
      ...typography.caption,
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    list: { padding: spacing.lg, paddingBottom: 100 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardTitle: { ...typography.h3, color: colors.text, flex: 1 },
    badge: { ...typography.label, color: colors.primary, fontSize: 10 },
    badgeOff: { color: colors.textMuted },
    schedule: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: spacing.sm,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    taskTitle: { ...typography.body, color: colors.text },
    taskDone: { textDecorationLine: "line-through", color: colors.textMuted },
    actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
    actionText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
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
    },
  });

type Nav = NativeStackNavigationProp<RoutinesStackParamList, "RoutinesList">;

export const RoutinesScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const navigation = useNavigation<Nav>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const fetchAlarms = useAlarmStore((s) => s.fetchAlarms);
  const markStale = useTaskStore((s) => s.markStale);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false);

  useScreenAnalytics(AnalyticsEvents.HABITS_OPENED);

  const loadRoutines = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const data = await routineService.getUserRoutines();
      setRoutines(data);
    } catch (e) {
      showError(t("common.error"), getApiErrorMessage(e));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutines();

    fetchAlarms(1, 1000, true);

    setRefreshing(false);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const previous = routines;
    try {
      const updatedTask = await routineService.toggleTaskCompletion(
        taskId,
        !completed,
      );
      fetchAlarms(1, 1000, true);

      setRoutines((current) =>
        current.map((routine) =>
          routine.id === updatedTask.routineId
            ? {
                ...routine,
                routineTasks: routine.routineTasks.map((task) =>
                  task.id === updatedTask.id ? updatedTask : task,
                ),
                updatedAt: new Date().toISOString(),
              }
            : routine,
        ),
      );
    } catch (e) {
      setRoutines(previous);
      showError(t("common.error"), getApiErrorMessage(e));
    }
  };

  const resetRoutine = (id: string) => {
    showConfirmDialog({
      title: t("routines.screen.resetTitle"),
      message: t("routines.screen.resetMessage"),
      confirmLabel: t("routines.screen.reset"),
      onConfirm: async () => {
        const previous = routines;
        try {
          await routineService.resetRoutine(id);
          setRoutines((current) =>
            current.map((routine) =>
              routine.id === id
                ? {
                    ...routine,
                    routineTasks: routine.routineTasks.map((task) => ({
                      ...task,
                      completed: false,
                      completedAt: undefined,
                      updatedAt: new Date().toISOString(),
                    })),
                    lastResetAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : routine,
            ),
          );
        } catch (e) {
          setRoutines(previous);
          showError(t("common.error"), getApiErrorMessage(e));
        }
      },
    });
  };

  const deleteRoutine = (routine: Routine) => {
    showConfirmDialog({
      title: t("routines.screen.deleteTitle"),
      itemName: routine.title,
      confirmLabel: t("routines.screen.delete"),
      destructive: true,
      onConfirm: async () => {
        const previous = routines;
        try {
          await routineService.deleteRoutine(routine.id);

          setRoutines((current) =>
            current.filter((item) => item.id !== routine.id),
          );
          fetchAlarms(1, 1000, true).catch(() => {});
          markStale();
        } catch (e) {
          setRoutines(previous);
          showError(t("common.error"), getApiErrorMessage(e));
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("routines.screen.title")}
      </Text>
      <Text
        style={[
          styles.sub,
          {
            textAlign: isArabic ? "right" : "left",
            writingDirection: isArabic ? "rtl" : "ltr",
          },
        ]}
      >
        {t("routines.screen.subtitle")}
      </Text>

      {loading && routines.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.list}
        >
          {routines.length === 0 ? (
            <EmptyState
              title={t("routines.screen.emptyTitle")}
              message={t("routines.screen.emptyMessage")}
              actionLabel={t("routines.screen.createRoutine")}
              onAction={() => navigation.navigate("RoutineCreate")}
            />
          ) : (
            routines.map((routine) => (
              <View key={routine.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("RoutineEdit", {
                      routineId: routine.id,
                    })
                  }
                >
                  <View
                    style={[
                      styles.cardHeader,
                      { flexDirection: isArabic ? "row-reverse" : "row" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardTitle,
                        {
                          textAlign: isArabic ? "right" : "left",
                          writingDirection: isArabic ? "rtl" : "ltr",
                        },
                      ]}
                    >
                      {routine.title}
                    </Text>
                    <Text
                      style={[
                        styles.badge,
                        !routine.enabled && styles.badgeOff,
                      ]}
                    >
                      {routine.enabled
                        ? t(`routines.frequency.${routine.frequency}`)
                        : t("routines.screen.off")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.schedule,
                      {
                        textAlign: isArabic ? "right" : "left",
                        writingDirection: isArabic ? "rtl" : "ltr",
                      },
                    ]}
                  >
                    {t("routines.screen.schedule", {
                      // time: routine.schedule.time || '—',
                      time: routine?.nextOccurrenceAt
                        ? formatTime(routine?.nextOccurrenceAt)
                        : "—",
                      frequency: t(`routines.frequency.${routine.frequency}`),
                      days: routine.schedule.days?.length
                        ? t("routines.screen.daysSuffix", {
                            days: routine.schedule.days
                              .map((d) => t(`routines.days.${d}`))
                              .join(","),
                          })
                        : "",
                    })}
                  </Text>
                </TouchableOpacity>
                {routine.routineTasks?.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskRow,
                      { flexDirection: isArabic ? "row-reverse" : "row" },
                    ]}
                    onPress={() => toggleTask(task.id, task.completed)}
                  >
                    <Icon
                      name={
                        task.completed
                          ? "checkbox-marked-circle"
                          : "checkbox-blank-circle-outline"
                      }
                      size={22}
                      color={task.completed ? colors.success : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.taskTitle,
                        task.completed && styles.taskDone,
                        {
                          textAlign: isArabic ? "right" : "left",
                          writingDirection: isArabic ? "rtl" : "ltr",
                        },
                      ]}
                    >
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View
                  style={[
                    styles.actions,
                    { flexDirection: isArabic ? "row-reverse" : "row" },
                  ]}
                >
                  <TouchableOpacity onPress={() => resetRoutine(routine.id)}>
                    <Text style={styles.actionText}>
                      {t("routines.screen.reset")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteRoutine(routine)}>
                    <Text style={[styles.actionText, { color: colors.error }]}>
                      {t("routines.screen.delete")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("RoutineCreate")}
      >
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};
