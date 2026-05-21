import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
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

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const cal = useCalendarData();
  const [refreshing, setRefreshing] = useState(false);
  const [modalTask, setModalTask] = useState<Task | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await cal.refresh();
    setRefreshing(false);
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < cal.monthData.days.length; i += 7) {
    weeks.push(cal.monthData.days.slice(i, i + 7));
  }

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
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, cal.selectedDate);
            const inMonth = isSameMonth(day, cal.currentDate);
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
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{format(day, 'd')}</Text>
                <View style={styles.dots}>
                  {dayTasks.slice(0, 3).map((t) => (
                    <View key={t.id} style={[styles.dot, { backgroundColor: priorityColor(t.priority) }]} />
                  ))}
                </View>
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
        return (
          <TouchableOpacity
            key={key}
            style={[styles.weekCard, isSelected && styles.weekCardSelected]}
            onPress={() => cal.setSelectedDate(day)}
          >
            <Text style={styles.weekCardDay}>{format(day, 'EEE')}</Text>
            <Text style={styles.weekCardNum}>{format(day, 'd')}</Text>
            <Text style={styles.weekCardCount}>{count} tasks</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderDayTimeline = () => (
    <View>
      {cal.dayTasks.length === 0 ? (
        <Text style={styles.emptyDay}>Nothing scheduled</Text>
      ) : (
        cal.dayTasks
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
          .map((task) => (
            <TouchableOpacity key={task.id} style={styles.timelineRow} onPress={() => setModalTask(task)}>
              <Text style={styles.timelineTime}>
                {task.dueDate ? format(new Date(task.dueDate), 'h:mm a') : '—'}
              </Text>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineTitle}>{task.title}</Text>
                {task.metadata?.isRoutineTask ? (
                  <Text style={styles.timelineMeta}>Routine · {task.metadata.routineTitle}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
      )}
    </View>
  );

  const renderSelectedList = () => {
    const items = cal.dayTasks;
    return (
      <View style={styles.selectedSection}>
        <Text style={styles.selectedTitle}>{format(cal.selectedDate, 'EEEE, MMM d')}</Text>
        {items.map((task) => (
          <TouchableOpacity key={task.id} style={styles.listRow} onPress={() => setModalTask(task)}>
            <Icon
              name={task.status === TaskStatus.DONE ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={22}
              color={task.status === TaskStatus.DONE ? colors.success : colors.textMuted}
            />
            <Text style={styles.listTitle} numberOfLines={1}>
              {task.title}
            </Text>
          </TouchableOpacity>
        ))}
        <Button
          label="Add task this day"
          variant="ghost"
          onPress={() =>
            navigation.navigate('Tasks', {
              screen: 'TaskCreate',
              params: { dueDate: cal.selectedDate.toISOString() },
            })
          }
        />
      </View>
    );
  };

  const shiftDate = (dir: -1 | 1) => {
    if (cal.viewMode === 'month') {
      cal.setCurrentDate(dir === 1 ? addMonths(cal.currentDate, 1) : subMonths(cal.currentDate, 1));
    } else if (cal.viewMode === 'week') {
      cal.setSelectedDate(dir === 1 ? addWeeks(cal.selectedDate, 1) : subWeeks(cal.selectedDate, 1));
    } else {
      cal.setSelectedDate(dir === 1 ? addDays(cal.selectedDate, 1) : subDays(cal.selectedDate, 1));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftDate(-1)}>
          <Icon name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {cal.viewMode === 'month'
            ? format(cal.currentDate, 'MMMM yyyy')
            : format(cal.selectedDate, 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity onPress={() => shiftDate(1)}>
          <Icon name="chevron-right" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        {(['month', 'week', 'day'] as CalendarViewMode[]).map((m) => (
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

      {cal.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.scroll}
        >
          {cal.viewMode === 'month' && renderMonth()}
          {cal.viewMode === 'week' && renderWeek()}
          {cal.viewMode === 'day' && renderDayTimeline()}
          {cal.viewMode !== 'day' && renderSelectedList()}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Routines')}
      >
        <Icon name="repeat" size={22} color="#fff" />
      </TouchableOpacity>

      <Modal visible={!!modalTask} transparent animationType="fade" onRequestClose={() => setModalTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTask?.title}</Text>
            {modalTask?.description ? <Text style={styles.modalBody}>{modalTask.description}</Text> : null}
            <Button
              label={modalTask?.status === TaskStatus.DONE ? 'Mark incomplete' : 'Mark complete'}
              onPress={async () => {
                if (!modalTask) return;
                try {
                  await cal.completeCalendarTask(modalTask);
                  setModalTask(null);
                } catch (e: any) {
                  Alert.alert('Error', e.message);
                }
              }}
            />
            {!modalTask?.metadata?.isRoutineTask ? (
              <Button
                label="Edit task"
                variant="secondary"
                onPress={() => {
                  setModalTask(null);
                  navigation.navigate('Tasks', {
                    screen: 'TaskEdit',
                    params: { taskId: modalTask!.id },
                  });
                }}
              />
            ) : null}
            <Button label="Close" variant="ghost" onPress={() => setModalTask(null)} />
          </View>
        </View>
      </Modal>
    </View>
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
  headerTitle: { ...typography.h2, color: colors.text },
  modeRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  modeText: { ...typography.label, color: colors.textMuted, fontSize: 11 },
  modeTextActive: { color: colors.primary },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  weekHeader: { flexDirection: 'row', marginBottom: spacing.sm },
  weekLabel: { flex: 1, textAlign: 'center', ...typography.label, color: colors.textMuted, fontSize: 10 },
  weekRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    minHeight: 56,
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
  dots: { flexDirection: 'row', gap: 2, marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  weekScroll: { marginBottom: spacing.md },
  weekCard: {
    width: 88,
    marginRight: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  weekCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  weekCardDay: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  weekCardNum: { ...typography.h2, color: colors.text },
  weekCardCount: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  emptyDay: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.xl },
  timelineRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  timelineTime: { width: 72, ...typography.caption, color: colors.primary },
  timelineBody: { flex: 1 },
  timelineTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  timelineMeta: { ...typography.caption, color: colors.accent, marginTop: 2 },
  selectedSection: { marginTop: spacing.lg },
  selectedTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listTitle: { ...typography.body, color: colors.text, flex: 1 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
