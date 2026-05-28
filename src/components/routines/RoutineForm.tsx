import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { openAndroidPicker } from '@/utils/dateTimePicker';
import { CreateRoutineData, RoutineFrequency } from '@/types/routine';
import { colors, spacing, typography } from '@/theme/tokens';

const DAYS = [
  { v: 0, l: 'Sun' },
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
];

interface RoutineFormProps {
  initial?: Partial<CreateRoutineData>;
  onSubmit: (data: CreateRoutineData) => Promise<void>;
  submitLabel: string;
  loading?: boolean;
}

export const RoutineForm: React.FC<RoutineFormProps> = ({ initial, onSubmit, submitLabel, loading }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [frequency, setFrequency] = useState<RoutineFrequency>(initial?.frequency || 'DAILY');
  const [time, setTime] = useState(initial?.schedule?.time || '08:00');
  const [days, setDays] = useState<number[]>(initial?.schedule?.days || [1, 2, 3, 4, 5]);
  const [monthDay, setMonthDay] = useState(String(initial?.schedule?.day || 1));
  const [reminderBefore, setReminderBefore] = useState(initial?.reminderBefore || '1h');
  const [showTime, setShowTime] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleSave = async () => {
    if (submitting.current || loading) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    submitting.current = true;
    const schedule: CreateRoutineData['schedule'] = { time };
    if (frequency === 'WEEKLY') schedule.days = days;
    if (frequency === 'MONTHLY') schedule.day = parseInt(monthDay, 10) || 1;

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        schedule,
        reminderBefore,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } finally {
      submitting.current = false;
    }
  };

  const openTimePicker = () => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    if (
      openAndroidPicker(d, 'time', (picked) => {
        setTime(`${picked.getHours().toString().padStart(2, '0')}:${picked.getMinutes().toString().padStart(2, '0')}`);
      })
    ) {
      return;
    }
    setShowTime(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multi]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor={colors.textMuted}
      />
      <Text style={styles.label}>Frequency</Text>
      <View style={styles.row}>
        {(['DAILY', 'WEEKLY', 'MONTHLY'] as RoutineFrequency[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, frequency === f && styles.chipOn]}
            onPress={() => setFrequency(f)}
          >
            <Text style={[styles.chipText, frequency === f && styles.chipTextOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Time</Text>
      <TouchableOpacity style={styles.input} onPress={openTimePicker}>
        <Text style={{ color: colors.text }}>{time}</Text>
      </TouchableOpacity>
      {showTime && Platform.OS === 'ios' && (
        <DateTimePicker
          value={(() => {
            const [h, m] = time.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m);
            return d;
          })()}
          mode="time"
          onChange={(_, d) => {
            if (d) {
              setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
            }
          }}
        />
      )}
      {frequency === 'WEEKLY' && (
        <>
          <Text style={styles.label}>Days</Text>
          <View style={styles.row}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d.v}
                style={[styles.chip, days.includes(d.v) && styles.chipOn]}
                onPress={() => toggleDay(d.v)}
              >
                <Text style={[styles.chipText, days.includes(d.v) && styles.chipTextOn]}>{d.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      {frequency === 'MONTHLY' && (
        <>
          <Text style={styles.label}>Day of month (1-31)</Text>
          <TextInput style={styles.input} value={monthDay} onChangeText={setMonthDay} keyboardType="number-pad" />
        </>
      )}
      <Text style={styles.label}>Remind before</Text>
      <View style={styles.row}>
        {['30m', '1h', '2h', '1d'].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, reminderBefore === r && styles.chipOn]}
            onPress={() => setReminderBefore(r)}
          >
            <Text style={[styles.chipText, reminderBefore === r && styles.chipTextOn]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.save, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveText}>{submitLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingBottom: 80 },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: colors.primary },
  save: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  err: { color: colors.error, marginBottom: spacing.sm },
});
