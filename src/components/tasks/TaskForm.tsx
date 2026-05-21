import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TaskPriority, TaskStatus } from '@/types/task';
import { colors, spacing, typography } from '@/theme/tokens';
import { priorityColor } from '@/utils/taskUi';

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
  showDatePicker: boolean;
  showTimePicker: boolean;
  selectedDate: Date;
  selectedTime: Date;
  hasTime: boolean;
  onToggleDatePicker: () => void;
  onToggleTimePicker: () => void;
  onDateChange: (date?: Date) => void;
  onTimeChange: (time?: Date) => void;
  onToggleHasTime: (v: boolean) => void;
  onClearDue: () => void;
}

const PRIORITIES = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT];
const STATUSES = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE];

export const TaskForm: React.FC<TaskFormProps> = ({
  values,
  errors,
  onChange,
  showDatePicker,
  showTimePicker,
  selectedDate,
  selectedTime,
  hasTime,
  onToggleDatePicker,
  onToggleTimePicker,
  onDateChange,
  onTimeChange,
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
    <View style={styles.dueRow}>
      <TouchableOpacity style={styles.dueBtn} onPress={onToggleDatePicker}>
        <Text style={styles.dueBtnText}>
          {values.dueDate ? selectedDate.toLocaleDateString() : 'Set date'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.dueBtn, !values.dueDate && styles.dueBtnDisabled]}
        onPress={() => values.dueDate && onToggleHasTime(!hasTime)}
        disabled={!values.dueDate}
      >
        <Text style={styles.dueBtnText}>{hasTime ? 'Time on' : 'Time off'}</Text>
      </TouchableOpacity>
      {hasTime && values.dueDate ? (
        <TouchableOpacity style={styles.dueBtn} onPress={onToggleTimePicker}>
          <Text style={styles.dueBtnText}>
            {values.dueTime || selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      ) : null}
      {values.dueDate ? (
        <TouchableOpacity onPress={onClearDue}>
          <Text style={styles.clearDue}>Clear</Text>
        </TouchableOpacity>
      ) : null}
    </View>
    {errors.dueDate ? <Text style={styles.err}>{errors.dueDate}</Text> : null}

    {showDatePicker && (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(_, d) => {
          if (Platform.OS === 'android') onToggleDatePicker();
          onDateChange(d);
        }}
      />
    )}
    {showTimePicker && hasTime && (
      <DateTimePicker
        value={selectedTime}
        mode="time"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(_, t) => {
          if (Platform.OS === 'android') onToggleTimePicker();
          onTimeChange(t);
        }}
      />
    )}
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
  dueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  dueBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dueBtnDisabled: { opacity: 0.4 },
  dueBtnText: { color: colors.text, ...typography.caption },
  clearDue: { color: colors.error, ...typography.caption },
});
