import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openAndroidPicker } from '@/utils/dateTimePicker';
import { useGoalStore } from '@/store/goalStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { Milestone, MilestoneStatus } from '@/types/goal';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { showAlert, showError, showSuccess, showConfirmDialog } from '@/components/ConfirmationDialog';
import { format } from 'date-fns';

export const GoalDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { goalId } = useRoute<RouteProp<{ params: { goalId: string } }, 'params'>>().params;

  const {
    currentGoal,
    fetchGoal,
    completeGoal,
    pauseGoal,
    resumeGoal,
    cancelGoal,
    createMilestone,
    updateMilestone,
    completeMilestone,
    deleteMilestone,
    generateAIPlan,
    isLoading,
  } = useGoalStore();

  const [refreshing, setRefreshing] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<'create' | 'edit' | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mDate, setMDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchGoal(goalId);
    }, [goalId, fetchGoal])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoal(goalId);
    setRefreshing(false);
  };

  const goal = currentGoal?.id === goalId ? currentGoal : null;

  const openCreateMilestone = () => {
    setSelectedMilestone(null);
    setMTitle('');
    setMDesc('');
    setMDate(null);
    setMilestoneModal('create');
  };

  const openEditMilestone = (m: Milestone) => {
    setSelectedMilestone(m);
    setMTitle(m.title);
    setMDesc(m.description || '');
    setMDate(m.targetDate ? new Date(m.targetDate) : null);
    setMilestoneModal('edit');
  };

  const saveMilestone = async () => {
    if (!mTitle.trim()) {
      showAlert('Title required', 'Enter a milestone title.', { variant: 'warning' });
      return;
    }
    try {
      const payload = {
        title: mTitle.trim(),
        description: mDesc.trim() || undefined,
        targetDate: mDate ? mDate.toISOString() : undefined,
      };
      if (milestoneModal === 'create') {
        await createMilestone(goalId, payload);
      } else if (selectedMilestone) {
        await updateMilestone(goalId, selectedMilestone.id, payload);
      }
      setMilestoneModal(null);
      await fetchGoal(goalId);
    } catch (e) {
      showError('Error', getApiErrorMessage(e));
    }
  };

  const onGenerateAI = async () => {
    setAiLoading(true);
    try {
      await generateAIPlan(goalId);
      track(AnalyticsEvents.AI_PLAN_GENERATED, { goalId });
      const { fetchAIUsage } = useSubscriptionStore.getState();
      await fetchAIUsage();
      const { aiPlansRemaining, isPremium } = useSubscriptionStore.getState();
      const remainingNote =
        isPremium || aiPlansRemaining == null
          ? 'Milestones and tasks were updated from your AI plan.'
          : `Milestones and tasks were updated. You have ${aiPlansRemaining} AI plan${
              aiPlansRemaining === 1 ? '' : 's'
            } remaining this month.`;
      showSuccess('Plan generated', remainingNote);
      await fetchGoal(goalId);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        showConfirmDialog({
          title: 'Monthly AI limit reached',
          message: getApiErrorMessage(e),
          variant: 'warning',
          confirmLabel: 'See Premium',
          cancelLabel: 'Not now',
          onConfirm: () => navigation.navigate('Paywall'),
        });
      } else {
        showError('Error', getApiErrorMessage(e));
      }
    } finally {
      setAiLoading(false);
    }
  };

  if (!goal && isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Goal not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>{goal.title}</Text>
        {goal.description ? <Text style={styles.body}>{goal.description}</Text> : null}
        <Text style={styles.meta}>
          {goal.status} · {goal.priority} · {goal.category}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, goal.progress || 0)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{Math.round(goal.progress || 0)}% complete</Text>

        {goal.targetDate ? (
          <Text style={styles.meta}>Target: {format(new Date(goal.targetDate), 'PPP')}</Text>
        ) : null}

        <View style={styles.actions}>
          <ActionBtn label="Edit" onPress={() => navigation.navigate('GoalEdit', { goalId })} />
          <ActionBtn label="Complete" onPress={() => completeGoal(goalId).catch((e) => showError('Error', getApiErrorMessage(e)))} />
          {goal.status === 'PAUSED' ? (
            <ActionBtn label="Resume" onPress={() => resumeGoal(goalId).catch((e) => showError('Error', getApiErrorMessage(e)))} />
          ) : (
            <ActionBtn label="Pause" onPress={() => pauseGoal(goalId).catch((e) => showError('Error', getApiErrorMessage(e)))} />
          )}
        </View>

        <TouchableOpacity style={styles.aiBtn} onPress={onGenerateAI} disabled={aiLoading}>
          {aiLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.aiBtnText}>Generate AI plan</Text>
          )}
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Milestones</Text>
          <TouchableOpacity onPress={openCreateMilestone}>
            <Text style={styles.link}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {goal.milestones?.length ? (
          goal.milestones.map((m) => (
            <View key={m.id} style={styles.milestone}>
              <View style={styles.mRow}>
                <Text style={styles.mTitle}>{m.title}</Text>
                <Text style={[styles.mStatus, m.status === MilestoneStatus.DONE && { color: colors.success }]}>
                  {m.status}
                </Text>
              </View>
              {m.description ? <Text style={styles.mDesc}>{m.description}</Text> : null}
              {m.targetDate ? <Text style={styles.mMeta}>{format(new Date(m.targetDate), 'MMM d, yyyy')}</Text> : null}
              <View style={styles.mActions}>
                {m.status !== MilestoneStatus.DONE && (
                  <TouchableOpacity onPress={() => completeMilestone(goalId, m.id).then(() => fetchGoal(goalId))}>
                    <Text style={styles.link}>Complete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEditMilestone(m)}>
                  <Text style={styles.link}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    showConfirmDialog({
                      title: 'Delete milestone?',
                      itemName: m.title,
                      confirmLabel: 'Delete',
                      destructive: true,
                      onConfirm: () => deleteMilestone(goalId, m.id).then(() => fetchGoal(goalId)),
                    })
                  }
                >
                  <Text style={[styles.link, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.body}>No milestones yet.</Text>
        )}

        <TouchableOpacity
          style={styles.danger}
          onPress={() =>
            showConfirmDialog({
              title: 'Cancel goal?',
              itemName: goal.title,
              confirmLabel: 'Yes',
              cancelLabel: 'No',
              destructive: true,
              onConfirm: () => cancelGoal(goalId).then(() => navigation.goBack()),
            })
          }
        >
          <Text style={styles.dangerText}>Cancel goal</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={milestoneModal !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{milestoneModal === 'create' ? 'New milestone' : 'Edit milestone'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={colors.textMuted}
              value={mTitle}
              onChangeText={setMTitle}
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              value={mDesc}
              onChangeText={setMDesc}
              multiline
            />
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                if (openAndroidPicker(mDate || new Date(), 'date', setMDate)) return;
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateText}>{mDate ? format(mDate, 'PPP') : 'No date'}</Text>
            </TouchableOpacity>
            {showDatePicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={mDate || new Date()}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setMDate(d)}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setMilestoneModal(null)}>
                <Text style={styles.link}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveMilestone}>
                <Text style={[styles.link, { fontWeight: '700' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const ActionBtn: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <Text style={styles.actionBtnText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  progressTrack: {
    height: 8,
    backgroundColor: colors.borderSubtle,
    borderRadius: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressLabel: { ...typography.caption, color: colors.primary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionBtnText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  aiBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  aiBtnText: { ...typography.body, color: colors.background, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  section: { ...typography.h3, color: colors.text },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  milestone: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  mRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mTitle: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1 },
  mStatus: { ...typography.caption, color: colors.textMuted },
  mDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  mMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  mActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  danger: { marginTop: spacing.xl, alignItems: 'center' },
  dangerText: { color: colors.error, ...typography.caption },
  error: { color: colors.error, padding: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  multiline: { minHeight: 72 },
  dateText: { color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
});
