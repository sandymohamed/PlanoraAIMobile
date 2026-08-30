import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isSameMonth,
} from "date-fns";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useCalendarData, CalendarViewMode } from "@/hooks/useCalendarData";
import { Task, TaskStatus } from "@/types/task";
import { formatDate } from "@/i18n";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { priorityColor } from "@/utils/taskUi";
import { Button } from "@/components/ui/Button";
import { AdBanner } from "@/features/ads";
import { showError } from "@/components/ConfirmationDialog";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { AnalyticsEvents } from "@/analytics/posthog";
import { setPendingAnalyticsContext } from "@/analytics/pendingContext";
import { useFocusEffect } from "@react-navigation/native";
import { useTaskStore } from "@/store/taskStore";
import { useGoalStore } from "@/store/goalStore";

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEW_MODES: CalendarViewMode[] = ["month", "week", "day", "agenda"];
const HOUR_SLOTS = Array.from({ length: 24 }, (_, h) => h);

// Memoized event accent function
const eventAccent = (task: Task, colors:PlanoraColors): string => {
  if (task.metadata?.isGoalMilestone || task.metadata?.isGoalTarget)
    return colors.accent;
  if (task.metadata?.isRoutineTask) return "#FBBF24";
  if (task.metadata?.isAlarm) return "#FF7043";
  return priorityColor(task.priority, colors);
};

// Memoized DayCell component to prevent unnecessary rerenders
const DayCell = memo(
  ({
    day,
    dayNumber,
    dotColors,
    isToday,
    isSelected,
    inMonth,
    onPress,
    onLongPress,
  }: any) => {
    const { styles, colors } = usePlanoraStyles(createStyles);

    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          !inMonth && styles.dayMuted,
          isToday && styles.dayToday,
          isSelected && styles.daySelected,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
      >
        <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>
          {dayNumber}
        </Text>
        <View style={styles.dots}>
          {dotColors.slice(0, 3).map((c: string, i: number) => (
            <View key={i} style={[styles.dot, { backgroundColor: c }]} />
          ))}
        </View>
      </TouchableOpacity>
    );
  },
);

DayCell.displayName = "DayCell";

// Memoized EventCard component
const EventCard = memo(
  ({ task, onPress }: { task: Task; onPress: (task: Task) => void }) => {
    const { styles, colors } = usePlanoraStyles(createStyles);
    const accent = eventAccent(task, colors);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { borderStartColor: accent }]}
        onPress={() => onPress(task)}
      >
        <Text style={styles.eventTitle} numberOfLines={1}>
          {task.title}
        </Text>
        {task.metadata?.routineTitle ? (
          <View style={styles.eventMetaRow}>
            <Text style={styles.eventMeta}>
              {task.metadata.routineHasReminder &&
              task.metadata.routineReminderBefore
                ? ` · ${task.metadata.routineReminderBefore}`
                : ""}
            </Text>
          </View>
        ) : null}
        {task.metadata?.goalTitle ? (
          <Text style={styles.eventMeta}>{task.metadata.goalTitle}</Text>
        ) : null}
      </TouchableOpacity>
    );
  },
);

EventCard.displayName = "EventCard";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    headerTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
    headerSub: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      fontSize: 10,
    },
    modeScroll: { maxHeight: 48 },
    modeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    modeChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    modeChipActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    modeText: {
      ...typography.label,
      color: colors.textMuted,
      minHeight: 25,
      fontSize: 10,
      lineHeight: 6.8,
    },
    modeTextActive: { color: colors.primary },
    syncing: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    syncingText: { ...typography.caption, color: colors.textMuted },
    scroll: { padding: spacing.lg, paddingBottom: 120 },
    weekHeader: { flexDirection: "row", marginBottom: spacing.sm },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      ...typography.label,
      color: colors.textMuted,
      fontSize: 10,
    },
    weekRow: { flexDirection: "row" },
    dayCell: {
      flex: 1,
      minHeight: 58,
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderRadius: 8,
      margin: 1,
    },
    dayMuted: { opacity: 0.35 },
    dayToday: { borderWidth: 1, borderColor: colors.primary },
    daySelected: { backgroundColor: colors.primary },
    dayNum: { ...typography.caption, color: colors.text, fontWeight: "600" },
    dayNumSelected: { color: "#fff" },
    dots: {
      flexDirection: "row",
      gap: 2,
      marginTop: 4,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    dot: { width: 5, height: 5, borderRadius: 3 },
    weekScroll: { marginBottom: spacing.md },
    weekCard: {
      width: 92,
      marginEnd: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    weekCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    weekCardToday: { borderColor: colors.accent },
    weekCardDay: { ...typography.label, color: colors.textMuted, fontSize: 10 },
    weekCardNum: { ...typography.h2, color: colors.text },
    weekCardCount: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    dayTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
    },
    timeSlot: { marginBottom: spacing.sm },
    timeSlotHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    timeLabel: { width: 52, ...typography.caption, color: colors.textMuted },
    timeLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
    nowDot: { width: 8, height: 8, borderRadius: 4, marginStart: 4 },
    emptySlot: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.surface,
      opacity: 0.7,
    },
    emptySlotText: { ...typography.caption, color: colors.primary },
    eventCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: spacing.sm,
      marginBottom: spacing.xs,
      borderStartWidth: 4,
    },
    eventTitle: { ...typography.body, color: colors.text, fontWeight: "600" },
    eventMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: 2,
    },
    eventMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyDay: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginVertical: spacing.xl,
    },
    agendaDay: { marginBottom: spacing.lg },
    agendaDayLabel: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    agendaRow: {
      flexDirection: "row",
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderStartWidth: 3,
      paddingStart: spacing.sm,
      marginBottom: spacing.xs,
    },
    agendaTime: { width: 64, ...typography.caption, color: colors.primary },
    agendaTitle: { flex: 1, ...typography.body, color: colors.text },
    upcomingSection: { marginBottom: spacing.lg },
    sectionTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    upcomingCard: {
      width: 140,
      marginEnd: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
    },
    upcomingTitle: {
      ...typography.body,
      color: colors.text,
      fontWeight: "600",
    },
    upcomingMeta: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 4,
    },
    selectedSection: { marginTop: spacing.lg },
    selectedTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    listDot: { width: 10, height: 10, borderRadius: 5 },
    listBody: { flex: 1 },
    listTitle: { ...typography.body, color: colors.text },
    listMeta: { ...typography.caption, color: colors.textMuted },
    moreText: {
      ...typography.caption,
      color: colors.textMuted,
      marginVertical: spacing.xs,
    },
    fab: {
      position: "absolute",
      end: spacing.lg,
      bottom: spacing.lg,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
    },
    fabBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    fabMenu: {
      position: "absolute",
      end: spacing.lg,
      bottom: spacing.lg + 60,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: spacing.xs,
    },
    fabMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
    },
    fabMenuText: { ...typography.body, color: colors.text },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    modalTitle: { ...typography.h2, color: colors.text },
    modalBody: { ...typography.body, color: colors.textSecondary },
    modalMeta: { ...typography.caption, color: colors.textMuted },
  });

export const  CalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);

  const cal = useCalendarData();
  const [refreshing, setRefreshing] = useState(false);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const nowRef = useRef(new Date());
  const flatListRef = useRef<FlatList>(null);
  const isFirstRender = useRef(true);

  const rootNav = navigation.getParent();

  useScreenAnalytics(AnalyticsEvents.CALENDAR_OPENED);

  // ✅ Optimized: Only refresh in background on first mount, not on every focus
  // useEffect(() => {
  //   if (isFirstRender.current) {
  //     isFirstRender.current = false;
  //     const timer = setTimeout(() => {
  //       cal.refreshInBackground().catch(() => {});
  //     }, 300);
  //     return () => clearTimeout(timer);
  //   }
  // }, []);

  // // ✅ Optimized: Use focus effect only for non-blocking background refresh
  // useFocusEffect(
  //   useCallback(() => {
  //     // Only refresh if data is stale, but do it in background
  //     if (!isFirstRender.current) {
  //       const timer = setTimeout(() => {
  //         cal.refreshInBackground().catch(() => {});
  //       }, 500);
  //       return () => clearTimeout(timer);
  //     }
  //   }, [cal.refreshInBackground]),
  // );

  // ✅ Only sync on first mount, not on every focus
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Only sync if data is stale
      const taskStore = useTaskStore.getState();
      const goalStore = useGoalStore.getState();

      const needsRefresh =
        (taskStore.needsRefresh && taskStore.needsRefresh()) ||
        (goalStore.needsRefresh && goalStore.needsRefresh());

      if (needsRefresh) {
        const timer = setTimeout(() => {
          cal.refreshInBackground().catch(() => {});
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // ✅ Use focus effect only for non-blocking background refresh with debounce
  useFocusEffect(
    useCallback(() => {
      // Only check for stale data on focus, but don't trigger sync unnecessarily
      const taskStore = useTaskStore.getState();
      const goalStore = useGoalStore.getState();

      const needsRefresh =
        (taskStore.needsRefresh && taskStore.needsRefresh()) ||
        (goalStore.needsRefresh && goalStore.needsRefresh());

      if (needsRefresh && !isFirstRender.current) {
        const timer = setTimeout(() => {
          cal.refreshInBackground().catch(() => {});
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [cal.refreshInBackground]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cal.forceRefresh({ includeAlarms: true });
    setRefreshing(false);
  }, [cal.forceRefresh]);

  const navigateCreateTask = useCallback(
    (dueDate?: Date, dueTime?: string) => {
      setPendingAnalyticsContext({ taskCreateSource: "calendar" });
      navigation.navigate("Tasks", {
        screen: "TaskCreate",
        params: {
          dueDate: dueDate?.toISOString(),
          dueTime,
        },
      });
    },
    [navigation],
  );

  const openEvent = useCallback((task: Task) => {
    setModalTask(task);
  }, []);

  const navigateFromEvent = useCallback(
    (task: Task) => {
      setModalTask(null);
      if (task.metadata?.isGoalMilestone || task.metadata?.isGoalTarget) {
        if (task.goalId) {
          rootNav?.navigate("Goals", {
            screen: "GoalDetail",
            params: { goalId: task.goalId },
          });
        }
        return;
      }
      if (task.metadata?.isRoutineTask) {
        rootNav?.navigate("Routines");
        return;
      }
      if (task.metadata?.isAlarm && task.metadata.alarmId) {
        rootNav?.navigate("Alarms");
        return;
      }
      const taskId = task.metadata?.recurrenceParentId || task.id;
      navigation.navigate("Tasks", {
        screen: "TaskDetail",
        params: { taskId },
      });
    },
    [navigation, rootNav],
  );

  // ✅ OPTIMIZED: Memoized month weeks calculation with useMemo
  const monthWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < cal.monthData.days.length; i += 7) {
      weeks.push(cal.monthData.days.slice(i, i + 7));
    }

    return weeks.map((week) =>
      week.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayTasks = cal.monthData.monthTasks[key] || [];
        const colorsSeen = new Set<string>();
        // Limit to first 3 tasks for dots
        dayTasks
          .slice(0, 3)
          .forEach((task) => colorsSeen.add(eventAccent(task, colors)));

        return {
          key,
          day,
          dayNumber: formatDate(day, { day: "numeric" }),
          dotColors: Array.from(colorsSeen),
          isToday: isSameDay(day, nowRef.current),
          isSelected: isSameDay(day, cal.selectedDate),
          inMonth: isSameMonth(day, cal.currentDate),
        };
      }),
    );
  }, [
    cal.monthData.days,
    cal.monthData.monthTasks,
    cal.selectedDate,
    cal.currentDate,
  ]);

  // ✅ OPTIMIZED: Memoized day timeline slots
  const dayTimelineSlots = useMemo(() => {
    const currentHour = nowRef.current.getHours();
    const showNowLine = isSameDay(cal.selectedDate, new Date());

    return HOUR_SLOTS.map((hour) => ({
      hour,
      label: formatDate(new Date(2020, 0, 1, hour), { hour: "numeric" }),
      tasks: cal.dayTasks.filter((t) => cal.getTaskHour(t) === hour),
      isNow: showNowLine && hour === currentHour,
    }));
  }, [cal.dayTasks, cal.getTaskHour, cal.selectedDate]);

  // ✅ OPTIMIZED: Memoized render functions
  const renderMonth = useCallback(
    () => (
      <View>
        <View style={styles.weekHeader}>
          {WEEK_LABELS.map((d, index) => (
            <Text key={d} style={styles.weekLabel}>
              {formatDate(addDays(new Date(2020, 5, 7), index), {
                weekday: "short",
              })}
            </Text>
          ))}
        </View>
        {monthWeeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell) => (
              <DayCell
                key={cell.key}
                day={cell.day}
                dayNumber={cell.dayNumber}
                dotColors={cell.dotColors}
                isToday={cell.isToday}
                isSelected={cell.isSelected}
                inMonth={cell.inMonth}
                onPress={() => cal.setSelectedDate(cell.day)}
                onLongPress={() => {
                  cal.setSelectedDate(cell.day);
                  setQuickAddOpen(true);
                }}
              />
            ))}
          </View>
        ))}
      </View>
    ),
    [monthWeeks, cal.setSelectedDate],
  );

  // ✅ OPTIMIZED: Render week with memoization
  const renderWeek = useCallback(() => {
    const weekDays = cal.weekData.weekDays;
    const weekTasks = cal.weekData.weekTasks;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekScroll}
      >
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const count = weekTasks[key]?.length || 0;
          const isSelected = isSameDay(day, cal.selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.weekCard,
                isSelected && styles.weekCardSelected,
                isToday && styles.weekCardToday,
              ]}
              onPress={() => cal.setSelectedDate(day)}
            >
              <Text style={styles.weekCardDay}>
                {formatDate(day, { weekday: "short" })}
              </Text>
              <Text style={styles.weekCardNum}>
                {formatDate(day, { day: "numeric" })}
              </Text>
              <Text style={styles.weekCardCount}>
                {t("common.event", { count })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [
    cal.weekData.weekDays,
    cal.weekData.weekTasks,
    cal.selectedDate,
    cal.setSelectedDate,
    t,
  ]);

  // ✅ OPTIMIZED: Render day timeline with FlatList for better performance
  const renderDayTimeline = useCallback(() => {
    const now = new Date();
    const showNowLine = isSameDay(cal.selectedDate, now);
    const currentHour = now.getHours();

    return (
      <View>
        <Text style={styles.dayTitle}>
          {formatDate(cal.selectedDate, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        <FlatList
          data={dayTimelineSlots}
          keyExtractor={(item) => `hour-${item.hour}`}
          renderItem={({ item: slot }) => (
            <View style={styles.timeSlot}>
              <View style={styles.timeSlotHeader}>
                <Text style={styles.timeLabel}>{slot.label}</Text>
                <View style={styles.timeLine} />
                {slot.isNow ? (
                  <View
                    style={[styles.nowDot, { backgroundColor: colors.primary }]}
                  />
                ) : null}
              </View>
              {slot.tasks.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptySlot}
                  onPress={() => {
                    const d = new Date(cal.selectedDate);
                    d.setHours(slot.hour, 0, 0, 0);
                    navigateCreateTask(
                      d,
                      `${slot.hour.toString().padStart(2, "0")}:00`,
                    );
                  }}
                >
                  <Icon name="plus" size={16} color={colors.primary} />
                  <Text style={styles.emptySlotText}>{t("calendar.add")}</Text>
                </TouchableOpacity>
              ) : (
                slot.tasks.map((task) => (
                  <EventCard key={task.id} task={task} onPress={openEvent} />
                ))
              )}
            </View>
          )}
          initialNumToRender={12}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }, [dayTimelineSlots, cal.selectedDate, navigateCreateTask, openEvent, t]);

  // ✅ OPTIMIZED: Render agenda with FlatList
  const renderAgenda = useCallback(() => {
    if (cal.agendaItems.length === 0) {
      return (
        <Text style={styles.emptyDay}>{t("calendar.noEventsPeriod")}</Text>
      );
    }
    return (
      <FlatList
        data={cal.agendaItems}
        keyExtractor={(item) => item.day}
        renderItem={({ item }) => (
          <View style={styles.agendaDay}>
            <Text style={styles.agendaDayLabel}>
              {formatDate(new Date(item.day), {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
            {item.tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.agendaRow,
                  { borderStartColor: eventAccent(task, colors) },
                ]}
                onPress={() => openEvent(task)}
              >
                <Text style={styles.agendaTime}>
                  {task.dueDate
                    ? formatDate(task.dueDate, {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </Text>
                <Text style={styles.agendaTitle} numberOfLines={2}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [cal.agendaItems, openEvent, t]);

  // ✅ OPTIMIZED: Memoized upcoming tasks
  const renderUpcoming = useCallback(() => {
    if (!cal.upcomingTasks.length) return null;

    return (
      <View style={styles.upcomingSection}>
        <Text style={styles.sectionTitle}>{t("calendar.next24Hours")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cal.upcomingTasks.slice(0, 10).map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.upcomingCard, { borderColor: eventAccent(task, colors) }]}
              onPress={() => openEvent(task)}
            >
              <Text style={styles.upcomingTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.upcomingMeta}>
                {task.dueDate ? cal.getTimeUntil(task.dueDate) : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }, [cal.upcomingTasks, cal.getTimeUntil, openEvent, t]);

  // ✅ OPTIMIZED: Memoized selected list
  const renderSelectedList = useCallback(() => {
    const items = cal.dayTasks;
    if (cal.viewMode === "day") return null;

    return (
      <View style={styles.selectedSection}>
        <Text style={styles.selectedTitle}>
          {formatDate(cal.selectedDate, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}{" "}
          · {t("common.event", { count: items.length })}
        </Text>
        {items.slice(0, 5).map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.listRow}
            onPress={() => openEvent(task)}
          >
            <View
              style={[styles.listDot, { backgroundColor: eventAccent(task, colors) }]}
            />
            <View style={styles.listBody}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.listMeta}>
                {task.dueDate
                  ? formatDate(task.dueDate, {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : t("calendar.allDay")}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {items.length > 5 ? (
          <Text style={styles.moreText}>
            +{items.length - 5} more{" "}
            {t("common.event", { count: items.length - 5 })}
          </Text>
        ) : null}
        <Button
          label={t("calendar.addTaskThisDay")}
          variant="ghost"
          onPress={() => navigateCreateTask(cal.selectedDate)}
        />
      </View>
    );
  }, [
    cal.dayTasks,
    cal.viewMode,
    cal.selectedDate,
    navigateCreateTask,
    openEvent,
    t,
  ]);

  const shiftDate = useCallback(
    (dir: -1 | 1) => {
      if (cal.viewMode === "month" || cal.viewMode === "agenda") {
        cal.setCurrentDate(
          dir === 1
            ? addMonths(cal.currentDate, 1)
            : subMonths(cal.currentDate, 1),
        );
      } else if (cal.viewMode === "week") {
        cal.setSelectedDate(
          dir === 1
            ? addWeeks(cal.selectedDate, 1)
            : subWeeks(cal.selectedDate, 1),
        );
      } else {
        cal.setSelectedDate(
          dir === 1
            ? addDays(cal.selectedDate, 1)
            : subDays(cal.selectedDate, 1),
        );
      }
    },
    [
      cal.viewMode,
      cal.currentDate,
      cal.selectedDate,
      cal.setCurrentDate,
      cal.setSelectedDate,
    ],
  );

  const headerLabel = useMemo(
    () =>
      cal.viewMode === "month" || cal.viewMode === "agenda"
        ? formatDate(cal.currentDate, { month: "long", year: "numeric" })
        : formatDate(cal.selectedDate, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
    [cal.viewMode, cal.currentDate, cal.selectedDate],
  );

  const { i18n } = useTranslation();

  // ✅ OPTIMIZED: Memoized header
  const renderHeader = useMemo(
    () => (
      <View
        style={[
          styles.header,
          { flexDirection: i18n.language === "ar" ? "row-reverse" : "row" },
        ]}
      >
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={12}>
          <Icon
            name={i18n.language === "ar" ? "chevron-right" : "chevron-left"}
            size={28}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const today = new Date();
            cal.setSelectedDate(today);
            cal.setCurrentDate(today);
          }}
        >
          <Text style={styles.headerTitle}>{headerLabel}</Text>
          <Text style={styles.headerSub}>{t("calendar.tapForToday")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shiftDate(1)} hitSlop={12}>
          <Icon
            name={i18n.language === "ar" ? "chevron-left" : "chevron-right"}
            size={28}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
    ),
    [
      shiftDate,
      headerLabel,
      t,
      i18n.language,
      cal.setSelectedDate,
      cal.setCurrentDate,
    ],
  );

  // ✅ OPTIMIZED: Memoized mode selector
  const renderModeSelector = useMemo(
    () => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeScroll}
      >
        <View style={styles.modeRow}>
          {VIEW_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeChip,
                cal.viewMode === m && styles.modeChipActive,
              ]}
              onPress={() => cal.setViewMode(m)}
            >
              <Text
                style={[
                  styles.modeText,
                  cal.viewMode === m && styles.modeTextActive,
                ]}
              >
                {t(`calendar.viewModes.${m}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    ),
    [cal.viewMode, cal.setViewMode, t],
  );

  // ✅ OPTIMIZED: Main content with FlatList for better performance
  const renderContent = useCallback(() => {
    const data = [{ key: "content" }];

    const renderItem = () => (
      <>
        {renderUpcoming()}
        {cal.viewMode === "month" && renderMonth()}
        {cal.viewMode === "week" && renderWeek()}
        {cal.viewMode === "day" && renderDayTimeline()}
        {cal.viewMode === "agenda" && renderAgenda()}
        {renderSelectedList()}
        <AdBanner placement="calendar" />
      </>
    );

    return (
      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={3}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [
    cal.viewMode,
    renderUpcoming,
    renderMonth,
    renderWeek,
    renderDayTimeline,
    renderAgenda,
    renderSelectedList,
    refreshing,
    onRefresh,
  ]);

  return (
    <View style={styles.container}>
      {renderHeader}
      {renderModeSelector}

      {cal.isSyncing && cal.isLoading === false && (
        <View style={styles.syncing}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.syncingText}>{t("calendar.syncing")}</Text>
        </View>
      )}

      {/* Show loading only on initial load */}
      {cal.isLoading && cal.dayTasks.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        renderContent()
      )}

      {/* FAB Menu */}
      {fabOpen ? (
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        />
      ) : null}

      {fabOpen ? (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabOpen(false);
              navigateCreateTask(cal.selectedDate);
            }}
          >
            <Icon
              name="checkbox-marked-circle-outline"
              size={20}
              color={colors.text}
            />
            <Text style={styles.fabMenuText}>{t("calendar.newTask")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabOpen(false);
              setPendingAnalyticsContext({ goalCreateSource: "calendar" });
              rootNav?.navigate("Goals", { screen: "GoalCreate" });
            }}
          >
            <Icon name="flag-outline" size={20} color={colors.text} />
            <Text style={styles.fabMenuText}>{t("calendar.newGoal")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabOpen(false);
              setPendingAnalyticsContext({ habitCreateSource: "calendar" });
              rootNav?.navigate("Routines", { screen: "RoutineCreate" });
            }}
          >
            <Icon name="repeat" size={20} color={colors.text} />
            <Text style={styles.fabMenuText}>{t("calendar.newRoutine")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setFabOpen(false);
              setPendingAnalyticsContext({ alarmCreateSource: "calendar" });
              rootNav?.navigate("Alarms", { screen: "AlarmCreate" });
            }}
          >
            <Icon name="alarm" size={20} color={colors.text} />
            <Text style={styles.fabMenuText}>{t("calendar.newAlarm")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabOpen((o) => !o)}
      >
        <Icon name={fabOpen ? "close" : "plus"} size={24} color="#fff" />
      </TouchableOpacity>

      {/* Quick Add Modal */}
      <Modal
        visible={quickAddOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickAddOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {formatDate(cal.selectedDate, { month: "short", day: "numeric" })}
            </Text>
            <Button
              label={t("calendar.addTask")}
              onPress={() => {
                setQuickAddOpen(false);
                navigateCreateTask(cal.selectedDate);
              }}
            />
            <Button
              label={t("calendar.addGoal")}
              variant="secondary"
              onPress={() => {
                setQuickAddOpen(false);
                setPendingAnalyticsContext({ goalCreateSource: "calendar" });
                rootNav?.navigate("Goals", { screen: "GoalCreate" });
              }}
            />
            <Button
              label={t("common.cancel")}
              variant="ghost"
              onPress={() => setQuickAddOpen(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={!!modalTask}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTask(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTask?.title}</Text>
            {modalTask?.description ? (
              <Text style={styles.modalBody}>{modalTask.description}</Text>
            ) : null}
            {modalTask?.dueDate ? (
              <Text style={styles.modalMeta}>
                {formatDate(modalTask.dueDate, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            ) : null}
            {!modalTask?.metadata?.isGoalMilestone &&
            !modalTask?.metadata?.isGoalTarget &&
            !modalTask?.metadata?.isRoutineTask &&
            !modalTask?.metadata?.isAlarm ? (
              <Button
                label={
                  modalTask?.status === TaskStatus.DONE
                    ? t("calendar.markIncomplete")
                    : t("calendar.markComplete")
                }
                onPress={async () => {
                  if (!modalTask) return;
                  try {
                    await cal.completeCalendarTask(modalTask);
                    setModalTask(null);
                  } catch (e: any) {
                    showError(t("common.error"), e.message);
                  }
                }}
              />
            ) : null}
            <Button
              label={t("calendar.openDetails")}
              onPress={() => modalTask && navigateFromEvent(modalTask)}
            />
            {!modalTask?.metadata?.isRoutineTask &&
            !modalTask?.metadata?.isGoalMilestone &&
            !modalTask?.metadata?.isAlarm ? (
              <Button
                label={t("calendar.editTask")}
                variant="secondary"
                onPress={() => {
                  if (!modalTask) return;
                  const taskId =
                    modalTask.metadata?.recurrenceParentId || modalTask.id;
                  setModalTask(null);
                  navigation.navigate("Tasks", {
                    screen: "TaskEdit",
                    params: { taskId },
                  });
                }}
              />
            ) : null}
            <Button
              label={t("common.close")}
              variant="ghost"
              onPress={() => setModalTask(null)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
