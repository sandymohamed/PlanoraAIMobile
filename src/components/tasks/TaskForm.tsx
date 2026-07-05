import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { TaskPriority, TaskStatus } from '@/types/task';
import { colors, spacing, typography } from '@/theme/tokens';
import { priorityColor } from '@/utils/taskUi';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  dueTime?: string;
}

interface TaskFormProps {
  values: TaskFormValues;
  errors: Record<string, string>;
  onChange: (patch: Partial<TaskFormValues>) => void;
  hasTime: boolean;
  selectedDateTime: Date | null;
  onDueChange: (date: Date | null) => void;
  onToggleHasTime: (v: boolean) => void;
  onClearDue: () => void;
}

const PRIORITIES = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT];
const STATUSES = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

export const TaskForm: React.FC<TaskFormProps> = ({
  values,
  errors,
  onChange,
  hasTime,
  selectedDateTime,
  onDueChange,
  onToggleHasTime,
  onClearDue,
}) => (
  <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
    <Text style={styles.label}>Title *</Text>
    <TextInput
      style={[styles.input, errors.title && styles.inputError]}
      value={values.title}
      onChangeText={(title) => onChange({ title })}
      placeholder="What needs to be done?"
      placeholderTextColor={colors.textMuted}
    />
    {errors.title ? <Text style={styles.err}>{errors.title}</Text> : null}

    <Text style={styles.label}>Description</Text>
    <TextInput
      style={[styles.input, styles.multiline]}
      value={values.description}
      onChangeText={(description) => onChange({ description })}
      placeholder="Optional details"
      placeholderTextColor={colors.textMuted}
      multiline
    />

    <Text style={styles.label}>Priority</Text>
    <View style={styles.rowChips}>
      {PRIORITIES.map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.chip, values.priority === p && { borderColor: priorityColor(p), backgroundColor: colors.primarySoft }]}
          onPress={() => onChange({ priority: p })}
        >
          <Text style={[styles.chipText, values.priority === p && { color: priorityColor(p) }]}>{p}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.label}>Status</Text>
    <View style={styles.rowChips}>
      {STATUSES.map((s) => (
        <TouchableOpacity
          key={s}
          style={[styles.chip, values.status === s && styles.chipActive]}
          onPress={() => onChange({ status: s })}
        >
          <Text style={[styles.chipText, values.status === s && styles.chipTextActive]}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.label}>Due date & time</Text>
    <DateTimePicker
      mode="datetime"
      value={selectedDateTime}
      onChange={onDueChange}
      optionalTime
      hasTime={hasTime}
      onHasTimeChange={onToggleHasTime}
      placeholder="No due date"
      helperText="Pick a quick due date. Add time only when you want a reminder."
      clearLabel="No due date"
      showClear={Boolean(values.dueDate)}
    />
    {errors.dueDate ? <Text style={styles.err}>{errors.dueDate}</Text> : null}
  </ScrollView>
);

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 120 },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...typography.body,
  },
  inputError: { borderColor: colors.error },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  err: { color: colors.error, ...typography.caption, marginTop: 4 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
});
