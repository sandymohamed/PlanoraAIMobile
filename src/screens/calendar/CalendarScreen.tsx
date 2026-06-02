import React, { useState, useMemo, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
} from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCalendarData, CalendarViewMode } from '@/hooks/useCalendarData';
import { Task, TaskStatus } from '@/types/task';
import { colors, spacing, typography } from '@/theme/tokens';
import { priorityColor } from '@/utils/taskUi';
import { Button } from '@/components/ui/Button';
import { BannerAdPlaceholder } from '@/features/ads';
import { showError } from '@/components/ConfirmationDialog';

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_MODES: CalendarViewMode[] = ['month', 'week', 'day', 'agenda'];
const HOUR_SLOTS = Array.from({ length: 24 }, (_, h) => h);

function eventAccent(task: Task): string {
  if (task.metadata?.isGoalMilestone || task.metadata?.isGoalTarget) return colors.accent;
  if (task.metadata?.isRoutineTask) return '#7C4DFF';
  if (task.metadata?.isAlarm) return '#FF7043';
  return priorityColor(task.priority);
}

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const cal = useCalendarData();
  const [refreshing, setRefreshing] = useState(false);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const nowRef = useRef(new Date());

  const rootNav = navigation.getParent();

  const onRefresh = async () => {
    setRefreshing(true);
    await cal.refresh();
    setRefreshing(false);
  };

  const navigateCreateTask = useCallback(
    (dueDate?: Date, dueTime?: string) => {
      navigation.navigate('Tasks', {
        screen: 'TaskCreate',
        params: {
          dueDate: dueDate?.toISOString(),
          dueTime,
        },
      });
    },
    [navigation]
  );

  const openEvent = useCallback((task: Task) => {
    setModalTask(task);
  }, []);

  const navigateFromEvent = useCallback(
    (task: Task) => {
      setModalTask(null);
      if (task.metadata?.isGoalMilestone || task.metadata?.isGoalTarget) {
        if (task.goalId) {
          rootNav?.navigate('Goals', { screen: 'GoalDetail', params: { goalId: task.goalId } });
        }
        return;
      }
      if (task.metadata?.isRoutineTask) {
        rootNav?.navigate('Routines');
        return;
      }
      if (task.metadata?.isAlarm && task.metadata.alarmId) {
        rootNav?.navigate('Alarms');
        return;
      }
      const taskId = task.metadata?.recurrenceParentId || task.id;
      navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId } });
    },
    [navigation, rootNav]
  );

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < cal.monthData.days.length; i += 7) {
      w.push(cal.monthData.days.slice(i, i + 7));
    }
    return w;
  }, [cal.monthData.days]);

  const currentHour = nowRef.current.getHours();
  const showNowLine = isSameDay(cal.selectedDate, new Date());

  const renderMonth = () => (
    <View>
      <View style={styles.weekHeader}>
        {WEEK_LABELS.map((d) => (
          <Text key={d} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = cal.monthData.monthTasks[key] || [];
            const reminders = cal.getRemindersOnDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, cal.selectedDate);
            const inMonth = isSameMonth(day, cal.currentDate);
            const colorsSeen = new Set<string>();
            dayTasks.forEach((t) => colorsSeen.add(eventAccent(t)));
            const dotColors = Array.from(colorsSeen).slice(0, 4);

            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.dayCell,
                  !inMonth && styles.dayMuted,
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
                onPress={() => cal.setSelectedDate(day)}
                onLongPress={() => {
                  cal.setSelectedDate(day);
                  setQuickAddOpen(true);
                }}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{format(day, 'd')}</Text>
                <View style={styles.dots}>
                  {dotColors.map((c) => (
                    <View key={c} style={[styles.dot, { backgroundColor: c }]} />
                  ))}
                </View>
                {reminders.length > 0 ? <Text style={styles.reminderBell}>🔔</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderWeek = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
      {cal.weekData.weekDays.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const count = cal.weekData.weekTasks[key]?.length || 0;
        const isSelected = isSameDay(day, cal.selectedDate);
        const isToday = isSameDay(day, new Date());
        return (
          <TouchableOpacity
            key={key}
            style={[styles.weekCard, isSelected && styles.weekCardSelected, isToday && styles.weekCardToday]}
            onPress={() => cal.setSelectedDate(day)}
          >
            <Text style={styles.weekCardDay}>{format(day, 'EEE')}</Text>
            <Text style={styles.weekCardNum}>{format(day, 'd')}</Text>
            <Text style={styles.weekCardCount}>{count} events</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderDayTimeline = () => {
    const slots = HOUR_SLOTS.map((hour) => ({
      hour,
      label:
        hour === 0
          ? '12 AM'
          : hour < 12
            ? `${hour} AM`
            : hour === 12
              ? '12 PM'
              : `${hour - 12} PM`,
      tasks: cal.dayTasks.filter((t) => cal.getTaskHour(t) === hour),
      reminders: cal.dayReminders.filter((r) => r.date.getHours() === hour),
    }));

    return (
      <View>
        <Text style={styles.dayTitle}>{format(cal.selectedDate, 'EEEE, MMMM d, yyyy')}</Text>
        <ScrollView style={styles.timelineScroll} nestedScrollEnabled>
          {slots.map((slot) => (
            <View key={slot.hour} style={styles.timeSlot}>
              <View style={styles.timeSlotHeader}>
                <Text style={styles.timeLabel}>{slot.label}</Text>
                <View style={styles.timeLine} />
                {showNowLine && slot.hour === currentHour ? (
                  <View style={[styles.nowDot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
              {slot.reminders.map(({ reminder, date }) => (
                <TouchableOpacity
                  key={reminder.id}
                  style={styles.reminderRow}
                  onPress={() => rootNav?.navigate('Routines')}
                >
                  <Text style={styles.reminderText}>🔔 {reminder.title}</Text>
                  <Text style={styles.reminderTime}>{format(date, 'h:mm a')}</Text>
                </TouchableOpacity>
              ))}
              {slot.tasks.length === 0 && slot.reminders.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptySlot}
                  onPress={() => {
                    const d = new Date(cal.selectedDate);
                    d.setHours(slot.hour, 0, 0, 0);
                    navigateCreateTask(d, `${slot.hour.toString().padStart(2, '0')}:00`);
                  }}
                >
                  <Icon name="plus" size={16} color={colors.primary} />
                  <Text style={styles.emptySlotText}>Add</Text>
                </TouchableOpacity>
              ) : (
                slot.tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.eventCard, { borderLeftColor: eventAccent(task) }]}
                    onPress={() => openEvent(task)}
                  >
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    {task.metadata?.routineTitle ? (
                      <Text style={styles.eventMeta}>Routine · {task.metadata.routineTitle}</Text>
                    ) : null}
                    {task.metadata?.goalTitle ? (
                      <Text style={styles.eventMeta}>Goal · {task.metadata.goalTitle}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderAgenda = () => (
    <View>
      {cal.agendaItems.length === 0 ? (
        <Text style={styles.emptyDay}>No events this period</Text>
      ) : (
        cal.agendaItems.map(({ day, tasks }) => (
          <View key={day} style={styles.agendaDay}>
            <Text style={styles.agendaDayLabel}>{format(new Date(day), 'EEE, MMM d')}</Text>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.agendaRow, { borderLeftColor: eventAccent(task) }]}
                onPress={() => openEvent(task)}
              >
                <Text style={styles.agendaTime}>
                  {task.dueDate ? format(new Date(task.dueDate), 'h:mm a') : '—'}
                </Text>
                <Text style={styles.agendaTitle} numberOfLines={2}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
    </View>
  );

  const renderUpcoming = () => {
    if (!cal.upcomingTasks.length) return null;
    return (
      <View style={styles.upcomingSection}>
        <Text style={styles.sectionTitle}>Next 24 hours</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cal.upcomingTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[styles.upcomingCard, { borderColor: eventAccent(task) }]}
              onPress={() => openEvent(task)}
            >
              <Text style={styles.upcomingTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.upcomingMeta}>
                {task.dueDate ? cal.getTimeUntil(task.dueDate) : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSelectedList = () => {
    const items = cal.dayTasks;
    const reminders = cal.dayReminders;
    if (cal.viewMode === 'day') return null;
    return (
      <View style={styles.selectedSection}>
        <Text style={styles.selectedTitle}>
          {format(cal.selectedDate, 'EEEE, MMM d')} · {items.length} events
          {reminders.length ? ` · ${reminders.length} reminders` : ''}
        </Text>
        {reminders.map(({ reminder, date }) => (
          <TouchableOpacity
            key={reminder.id}
            style={styles.listRow}
            onPress={() => rootNav?.navigate('Routines')}
          >
            <Icon name="bell-outline" size={20} color="#FFA726" />
            <View style={styles.listBody}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {reminder.title}
              </Text>
              <Text style={styles.listMeta}>{format(date, 'h:mm a')}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {items.map((task) => (
          <TouchableOpacity key={task.id} style={styles.listRow} onPress={() => openEvent(task)}>
            <View style={[styles.listDot, { backgroundColor: eventAccent(task) }]} />
            <View style={styles.listBody}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.listMeta}>
                {task.dueDate ? format(new Date(task.dueDate), 'h:mm a') : 'All day'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <Button
          label="Add task this day"
          variant="ghost"
          onPress={() => navigateCreateTask(cal.selectedDate)}
        />
      </View>
    );
  };

  const shiftDate = (dir: -1 | 1) => {
    if (cal.viewMode === 'month' || cal.viewMode === 'agenda') {
      cal.setCurrentDate(dir === 1 ? addMonths(cal.currentDate, 1) : subMonths(cal.currentDate, 1));
    } else if (cal.viewMode === 'week') {
      cal.setSelectedDate(dir === 1 ? addWeeks(cal.selectedDate, 1) : subWeeks(cal.selectedDate, 1));
    } else {
      cal.setSelectedDate(dir === 1 ? addDays(cal.selectedDate, 1) : subDays(cal.selectedDate, 1));
    }
  };

  const headerLabel =
    cal.viewMode === 'month' || cal.viewMode === 'agenda'
      ? format(cal.currentDate, 'MMMM yyyy')
      : format(cal.selectedDate, 'MMM d, yyyy');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftDate(-1)} hitSlop={12}>
          <Icon name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const today = new Date();
            cal.setSelectedDate(today);
            cal.setCurrentDate(today);
          }}
        >
          <Text style={styles.headerTitle}>{headerLabel}</Text>
          <Text style={styles.headerSub}>Tap for today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shiftDate(1)} hitSlop={12}>
          <Icon name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
        <View style={styles.modeRow}>
          {VIEW_MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeChip, cal.viewMode === m && styles.modeChipActive]}
              onPress={() => cal.setViewMode(m)}
            >
              <Text style={[styles.modeText, cal.viewMode === m && styles.modeTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
    </View>
      </ScrollView >

{
  cal.isLoading ? (
    <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
  ) : (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      contentContainerStyle={styles.scroll}
    >
      {renderUpcoming()}
      {cal.viewMode === 'month' && renderMonth()}
      {cal.viewMode === 'week' && renderWeek()}
      {cal.viewMode === 'day' && renderDayTimeline()}
      {cal.viewMode === 'agenda' && renderAgenda()}
      {renderSelectedList()}
      <BannerAdPlaceholder placement="calendar" />
    </ScrollView>
  )
}

{
  fabOpen ? (
    <TouchableOpacity style={styles.fabBackdrop} activeOpacity={1} onPress={() => setFabOpen(false)} />
  ) : null
}

{
  fabOpen ? (
    <View style={styles.fabMenu}>
      <TouchableOpacity
        style={styles.fabMenuItem}
        onPress={() => {
          setFabOpen(false);
          navigateCreateTask(cal.selectedDate);
        }}
      >
        <Icon name="checkbox-marked-circle-outline" size={20} color={colors.text} />
        <Text style={styles.fabMenuText}>New task</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.fabMenuItem}
        onPress={() => {
          setFabOpen(false);
          rootNav?.navigate('Goals', { screen: 'GoalCreate' });
        }}
      >
        <Icon name="flag-outline" size={20} color={colors.text} />
        <Text style={styles.fabMenuText}>New goal</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.fabMenuItem}
        onPress={() => {
          setFabOpen(false);
          rootNav?.navigate('Routines', { screen: 'RoutineCreate' });
        }}
      >
        <Icon name="repeat" size={20} color={colors.text} />
        <Text style={styles.fabMenuText}>New routine</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.fabMenuItem}
        onPress={() => {
          setFabOpen(false);
          rootNav?.navigate('Alarms', { screen: 'AlarmCreate' });
        }}
      >
        <Icon name="alarm" size={20} color={colors.text} />
        <Text style={styles.fabMenuText}>New alarm</Text>
      </TouchableOpacity>
    </View>
  ) : null
}

      <TouchableOpacity style={styles.fab} onPress={() => setFabOpen((o) => !o)}>
        <Icon name={fabOpen ? 'close' : 'plus'} size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={quickAddOpen} transparent animationType="fade" onRequestClose={() => setQuickAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{format(cal.selectedDate, 'MMM d')}</Text>
            <Button label="Add task" onPress={() => { setQuickAddOpen(false); navigateCreateTask(cal.selectedDate); }} />
            <Button label="Add goal" variant="secondary" onPress={() => { setQuickAddOpen(false); rootNav?.navigate('Goals', { screen: 'GoalCreate' }); }} />
            <Button label="Cancel" variant="ghost" onPress={() => setQuickAddOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!modalTask} transparent animationType="fade" onRequestClose={() => setModalTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTask?.title}</Text>
            {modalTask?.description ? <Text style={styles.modalBody}>{modalTask.description}</Text> : null}
            {modalTask?.dueDate ? (
              <Text style={styles.modalMeta}>
                {format(new Date(modalTask.dueDate), 'MMM d, yyyy h:mm a')}
              </Text>
            ) : null}
            {!modalTask?.metadata?.isGoalMilestone &&
              !modalTask?.metadata?.isGoalTarget &&
              !modalTask?.metadata?.isAlarm ? (
              <Button
                label={modalTask?.status === TaskStatus.DONE ? 'Mark incomplete' : 'Mark complete'}
                onPress={async () => {
                  if (!modalTask) return;
                  try {
                    await cal.completeCalendarTask(modalTask);
                    setModalTask(null);
                  } catch (e: any) {
                    showError('Error', e.message);
                  }
                }}
              />
            ) : null}
            <Button label="Open details" onPress={() => modalTask && navigateFromEvent(modalTask)} />
            {!modalTask?.metadata?.isRoutineTask &&
              !modalTask?.metadata?.isGoalMilestone &&
              !modalTask?.metadata?.isAlarm ? (
              <Button
                label="Edit task"
                variant="secondary"
                onPress={() => {
                  if (!modalTask) return;
                  const taskId = modalTask.metadata?.recurrenceParentId || modalTask.id;
                  setModalTask(null);
                  navigation.navigate('Tasks', { screen: 'TaskEdit', params: { taskId } });
                }}
              />
            ) : null}
            <Button label="Close" variant="ghost" onPress={() => setModalTask(null)} />
          </View>
        </View>
      </Modal>
    </View >
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  headerSub: { ...typography.caption, color: colors.textMuted, textAlign: 'center', fontSize: 10 },
  modeScroll: { maxHeight: 48, },
  modeRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  modeText: { ...typography.label, color: colors.textMuted, minHeight: 25, fontSize: 10, lineHeight: 6.8 },
  modeTextActive: { color: colors.primary,  },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  weekHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  weekLabel: { flex: 1, textAlign: 'center', ...typography.label, color: colors.textMuted, fontSize: 10 },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    margin: 1,
  },
  dayMuted: { opacity: 0.35 },
  dayToday: { borderWidth: 1, borderColor: colors.primary },
  daySelected: { backgroundColor: colors.primary },
  dayNum: { ...typography.caption, color: colors.text, fontWeight: '600' },
  dayNumSelected: { color: '#fff' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  reminderBell: { fontSize: 8, marginTop: 2 },
  weekScroll: { marginBottom: spacing.md },
  weekCard: {
    width: 92,
    marginRight: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  weekCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  weekCardToday: { borderColor: colors.accent },
  weekCardDay: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  weekCardNum: { ...typography.h2, color: colors.text },
  weekCardCount: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  dayTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  timelineScroll: { maxHeight: Dimensions.get('window').height * 0.55 },
  timeSlot: { marginBottom: spacing.sm },
  timeSlotHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  timeLabel: { width: 52, ...typography.caption, color: colors.textMuted },
  timeLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  nowDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderLeftWidth: 4,
  },
  eventTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  eventMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: 'rgba(255,167,38,0.12)',
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  reminderText: { ...typography.caption, color: colors.text, flex: 1 },
  reminderTime: { ...typography.caption, color: colors.textMuted },
  emptyDay: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.xl },
  agendaDay: { marginBottom: spacing.lg },
  agendaDayLabel: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  agendaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  agendaTime: { width: 64, ...typography.caption, color: colors.primary },
  agendaTitle: { flex: 1, ...typography.body, color: colors.text },
  upcomingSection: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  upcomingCard: {
    width: 140,
    marginRight: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
  },
  upcomingTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  upcomingMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  selectedSection: { marginTop: spacing.lg },
  selectedTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  listDot: { width: 10, height: 10, borderRadius: 5 },
  listBody: { flex: 1 },
  listTitle: { ...typography.body, color: colors.text },
  listMeta: { ...typography.caption, color: colors.textMuted },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fabMenu: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 60,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.xs,
  },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  fabMenuText: { ...typography.body, color: colors.text },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
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
