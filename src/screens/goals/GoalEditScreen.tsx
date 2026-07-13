import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useGoalStore } from '@/store/goalStore';
import { GoalPriority } from '@/types/goal';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { showAlert, showError } from '@/components/ConfirmationDialog';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

const CATEGORIES = ['Personal', 'Work', 'Health', 'Learning', 'Finance', 'Other'];

export const GoalEditScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { goalId } = useRoute<RouteProp<{ params: { goalId: string } }, 'params'>>().params;
  
  // Read from store - instant render from cache
  const currentGoal = useGoalStore((s) => s.currentGoal);
  const isLoading = useGoalStore((s) => s.isLoading);
  const isLoaded = useGoalStore((s) => s.isLoaded);
  
  // Store actions
  const fetchGoal = useGoalStore((s) => s.fetchGoal);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const textDir = { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' } as const;
  const rowDir = { flexDirection: isArabic ? 'row-reverse' : 'row' } as const;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<GoalPriority>(GoalPriority.MEDIUM);
  const [category, setCategory] = useState('Personal');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [isLoadingGoal, setIsLoadingGoal] = useState(false);
  const submitting = useRef(false);

  const goal = currentGoal?.id === goalId ? currentGoal : null;

  // ✅ Only fetch if goal doesn't exist in cache
  useEffect(() => {
    if (!goal && isLoaded) {
      setIsLoadingGoal(true);
      fetchGoal(goalId)
        .catch(() => {})
        .finally(() => {
          setIsLoadingGoal(false);
        });
    }
  }, [goal, goalId, fetchGoal, isLoaded]);

  useEffect(() => {
    if (!goal) return;
    setTitle(goal.title);
    setDescription(goal.description || '');
    setPriority(goal.priority);
    setCategory(goal.category);
    setTargetDate(goal.targetDate ? new Date(goal.targetDate) : null);
  }, [goal]);

  const submit = async () => {
    if (submitting.current) return;
    if (!title.trim()) {
      showAlert(t('goals.form.titleRequired'), t('goals.form.titleRequiredMessage'), { variant: 'warning' });
      return;
    }
    submitting.current = true;
    try {
      await updateGoal(goalId, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        targetDate: targetDate ? targetDate.toISOString() : undefined,
      });
      navigation.goBack();
    } catch (e) {
      showError(t('common.error'), getApiErrorMessage(e));
    } finally {
      submitting.current = false;
    }
  };

  // ✅ Show loading only if goal doesn't exist and we're fetching it
  if ((!goal && isLoadingGoal) || (!goal && !isLoaded)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.center}>
        <Text style={[styles.error, textDir]}>{t('goals.screen.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.label, textDir]}>{t('goals.form.title')}</Text>
      <TextInput style={[styles.input, textDir]} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />

      <Text style={[styles.label, textDir]}>{t('goals.form.description')}</Text>
      <TextInput
        style={[styles.input, styles.multiline, textDir]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, textDir]}>{t('goals.form.priority')}</Text>
      <View style={[styles.row, rowDir]}>
        {Object.values(GoalPriority).map((p) => (
          <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive]} onPress={() => setPriority(p)}>
            <Text style={[styles.chipText, textDir, priority === p && styles.chipTextActive]}>{t(`goals.priority.${p}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, textDir]}>{t('goals.form.category')}</Text>
      <View style={[styles.rowWrap, rowDir]}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, textDir, category === c && styles.chipTextActive]}>{t(`goals.categories.${c}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, textDir]}>{t('goals.form.targetDate')}</Text>
      <DateTimePicker
        mode="date"
        value={targetDate}
        onChange={setTargetDate}
        placeholder={t('goals.form.noTargetDate')}
        clearLabel={t('goals.form.noTargetDate')}
        helperText={t('goals.form.targetDateHelper')}
        showClear={Boolean(targetDate)}
      />

      <TouchableOpacity style={styles.submit} onPress={submit} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={[styles.submitText, textDir]}>{t('goals.form.saveChanges')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexWrap: 'wrap', gap: spacing.sm },
  rowWrap: { flexWrap: 'wrap', gap: spacing.sm },
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
  submit: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitText: { ...typography.body, color: colors.background, fontWeight: '600' },
  error: { ...typography.body, color: colors.error, padding: spacing.lg },
});