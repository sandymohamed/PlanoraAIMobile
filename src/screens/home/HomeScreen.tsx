import React, { useEffect, useState, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { routineService } from '@/services/routineService';
import { goalService } from '@/services/goalService';
import { Goal } from '@/types/goal';
import { Task, TaskStatus } from '@/types/task';
import { Routine } from '@/types/routine';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { BannerAdPlaceholder } from '@/features/ads';
import { PremiumLabel } from '@/components/premium/PremiumBadge';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const { tasks, fetchTasks } = useTaskStore();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await fetchTasks();
    try {
      const [r, gRes] = await Promise.all([routineService.getUserRoutines(), goalService.getGoals({ limit: 5 })]);
      setRoutines(r.filter((x) => x.enabled).slice(0, 3));
      setGoals((gRes.data || []).slice(0, 3));
    } catch {
      /* keep partial data */
    }
  }, [fetchTasks]);

  useEffect(() => {
    load();
  }, [load]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const todayTasks = tasks
    .filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), new Date()) && !t.metadata?.isRoutineTask)
    .slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={styles.greeting}>
        {greeting()}
        {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
      </Text>
      <Text style={styles.sub}>Your plan for today is ready.</Text>

      {/* Today's focus */}
      <Card elevated style={styles.focusCard}>
        <Text style={styles.sectionLabel}>TODAY'S FOCUS</Text>
        <Text style={styles.focusTitle}>Complete your top 3 tasks</Text>
        <Text style={styles.focusMeta}>Tap Tasks to see what's due</Text>
      </Card>

      {/* AI suggestion */}
      <TouchableOpacity
        onPress={() => {
          track(AnalyticsEvents.AI_PLAN_GENERATED, { source: 'home' });
          navigation.navigate('Goals');
        }}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCard}
        >
          <Icon name="sparkles" size={28} color="#fff" />
          <View style={styles.aiText}>
            <PremiumLabel requiredPlan="pro">
              <Text style={styles.aiTitle}>AI suggestion</Text>
            </PremiumLabel>
            <Text style={styles.aiBody}>Review your active goal and let AI refine this week's plan.</Text>
          </View>
          <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick actions row */}
      <View style={styles.quickRow}>
        <QuickAction icon="timer-outline" label="Focus" onPress={() => navigation.navigate('Focus')} />
        <QuickAction icon="alarm" label="Alarms" onPress={() => navigation.navigate('Alarms')} />
        <QuickAction icon="repeat" label="Routines" onPress={() => navigation.navigate('Routines')} />
        <QuickAction icon="chart-timeline-variant" label="Weekly" onPress={() => navigation.navigate('WeeklyReview')} />
      </View>

      {/* Today's tasks preview */}
      <SectionHeader title="Today's tasks" action="See all" onAction={() => navigation.navigate('Tasks')} />
      <Card>
        {todayTasks.length === 0 ? (
          <Text style={styles.focusMeta}>No tasks due today</Text>
        ) : (
          todayTasks.map((t) => (
            <TaskRow key={t.id} title={t.title} done={t.status === TaskStatus.DONE} />
          ))
        )}
      </Card>

      {/* Active routines */}
      <SectionHeader title="Active routines" action="Manage" onAction={() => navigation.navigate('Routines')} />
      <Card>
        {routines.length === 0 ? (
          <Text style={styles.focusMeta}>No active routines</Text>
        ) : (
          routines.map((r) => (
            <RoutineRow key={r.id} name={r.title} streak={r.routineTasks?.filter((t) => t.completed).length || 0} />
          ))
        )}
      </Card>

      {/* Goal progress */}
      <SectionHeader title="Goal progress" action="Goals" onAction={() => navigation.navigate('Goals')} />
      <Card>
        {goals.length === 0 ? (
          <Text style={styles.focusMeta}>No goals — tap AI on Goals tab</Text>
        ) : (
          goals.map((g) => (
            <ProgressBar key={g.id} label={g.title} progress={Math.round(g.progress || 0)} />
          ))
        )}
      </Card>

      {/* Streak */}
      <Card style={styles.streakCard}>
        <Icon name="fire" size={32} color={colors.warning} />
        <View>
          <Text style={styles.streakNum}>7 day streak</Text>
          <Text style={styles.streakMeta}>Weekly consistency — keep going</Text>
        </View>
      </Card>

      <BannerAdPlaceholder placement="home" />
    </ScrollView>
  );
};

const QuickAction: React.FC<{ icon: string; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickItem} onPress={onPress}>
    <View style={styles.quickIcon}>
      <Icon name={icon} size={22} color={colors.primary} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

const SectionHeader: React.FC<{ title: string; action: string; onAction: () => void }> = ({ title, action, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity onPress={onAction}>
      <Text style={styles.sectionAction}>{action}</Text>
    </TouchableOpacity>
  </View>
);

const TaskRow: React.FC<{ title: string; done?: boolean }> = ({ title, done }) => (
  <View style={styles.taskRow}>
    <Icon name={done ? 'check-circle' : 'circle-outline'} size={22} color={done ? colors.success : colors.textMuted} />
    <Text style={[styles.taskTitle, done && styles.taskDone]}>{title}</Text>
  </View>
);

const RoutineRow: React.FC<{ name: string; streak: number }> = ({ name, streak }) => (
  <View style={styles.taskRow}>
    <Icon name="repeat" size={20} color={colors.accent} />
    <Text style={styles.taskTitle}>{name}</Text>
    <Text style={styles.streakBadge}>{streak}d</Text>
  </View>
);

const ProgressBar: React.FC<{ label: string; progress: number }> = ({ label, progress }) => (
  <View style={styles.progressWrap}>
    <View style={styles.progressHeader}>
      <Text style={styles.taskTitle}>{label}</Text>
      <Text style={styles.progressPct}>{progress}%</Text>
    </View>
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  greeting: { ...typography.hero, color: colors.text },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  focusCard: { marginBottom: spacing.md },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  focusTitle: { ...typography.h2, color: colors.text },
  focusMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  aiText: { flex: 1 },
  aiTitle: { ...typography.h3, color: '#fff' },
  aiBody: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quickItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: { ...typography.caption, color: colors.text, fontWeight: '600', fontSize: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },
  sectionAction: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  taskTitle: { ...typography.body, color: colors.text, flex: 1 },
  taskDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  streakBadge: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  progressWrap: { marginBottom: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressPct: { ...typography.caption, color: colors.primary },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  streakNum: { ...typography.h3, color: colors.text },
  streakMeta: { ...typography.caption, color: colors.textSecondary },
});
