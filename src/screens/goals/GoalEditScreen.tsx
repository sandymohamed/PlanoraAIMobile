import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openAndroidPicker } from '@/utils/dateTimePicker';
import { useGoalStore } from '@/store/goalStore';
import { GoalPriority } from '@/types/goal';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { format } from 'date-fns';

const CATEGORIES = ['Personal', 'Work', 'Health', 'Learning', 'Finance', 'Other'];

export const GoalEditScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { goalId } = useRoute<RouteProp<{ params: { goalId: string } }, 'params'>>().params;
  const { currentGoal, fetchGoal, updateGoal, isLoading } = useGoalStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<GoalPriority>(GoalPriority.MEDIUM);
  const [category, setCategory] = useState('Personal');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const submitting = useRef(false);

  const openTargetDate = () => {
    if (openAndroidPicker(targetDate || new Date(), 'date', setTargetDate)) return;
    setShowDatePicker(true);
  };

  useEffect(() => {
    fetchGoal(goalId);
  }, [goalId, fetchGoal]);

  useEffect(() => {
    if (!currentGoal || currentGoal.id !== goalId) return;
    setTitle(currentGoal.title);
    setDescription(currentGoal.description || '');
    setPriority(currentGoal.priority);
    setCategory(currentGoal.category);
    setTargetDate(currentGoal.targetDate ? new Date(currentGoal.targetDate) : null);
  }, [currentGoal, goalId]);

  const submit = async () => {
    if (submitting.current) return;
    if (!title.trim()) {
      Alert.alert('Title required', 'Enter a goal title.');
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
      Alert.alert('Error', getApiErrorMessage(e));
    } finally {
      submitting.current = false;
    }
  };

  if (!currentGoal && isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.row}>
        {Object.values(GoalPriority).map((p) => (
          <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive]} onPress={() => setPriority(p)}>
            <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.rowWrap}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Target date</Text>
      <TouchableOpacity style={styles.input} onPress={openTargetDate}>
        <Text style={styles.dateText}>{targetDate ? format(targetDate, 'PPP') : 'None'}</Text>
      </TouchableOpacity>

      {showDatePicker && Platform.OS === 'ios' && (
        <DateTimePicker
          value={targetDate || new Date()}
          mode="date"
          display="spinner"
          onChange={(_, d) => d && setTargetDate(d)}
        />
      )}

      <TouchableOpacity style={styles.submit} onPress={submit} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.submitText}>Save changes</Text>}
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  dateText: { ...typography.body, color: colors.text },
  submit: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitText: { ...typography.body, color: colors.background, fontWeight: '600' },
});
