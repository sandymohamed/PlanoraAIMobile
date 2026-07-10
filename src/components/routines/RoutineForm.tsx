import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CreateRoutineData, RoutineFrequency } from '@/types/routine';
import { colors, spacing, typography } from '@/theme/tokens';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6];
const FREQUENCIES: RoutineFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY'];
const REMIND_OPTIONS = ['30m', '1h', '2h', '1d'];

interface RoutineFormProps {
  initial?: Partial<CreateRoutineData>;
  onSubmit: (data: CreateRoutineData) => Promise<void>;
  submitLabel: string;
  loading?: boolean;
}

export const RoutineForm: React.FC<RoutineFormProps> = ({ initial, onSubmit, submitLabel, loading }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [frequency, setFrequency] = useState<RoutineFrequency>(initial?.frequency || 'DAILY');
  const [time, setTime] = useState(initial?.schedule?.time || '08:00');
  const [days, setDays] = useState<number[]>(initial?.schedule?.days || [1, 2, 3, 4, 5]);
  const [monthDay, setMonthDay] = useState(String(initial?.schedule?.day || 1));
  const [reminderBefore, setReminderBefore] = useState(initial?.reminderBefore || '1h');
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const timeValue = (() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const toggleDay = (d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const handleSave = async () => {
    if (submitting.current || loading) return;
    if (!title.trim()) {
      setError(t('routines.form.titleRequired'));
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

  return (
    <ScrollView
      contentContainerStyle={[
        styles.wrap,
        { alignItems: isArabic ? 'flex-end' : 'flex-start' },
      ]}
    >
      {error ? (
        <Text style={[styles.err, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {error}
        </Text>
      ) : null}
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('routines.form.title')}
      </Text>
      <TextInput
        style={[styles.input, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={colors.textMuted}
      />
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('routines.form.description')}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.multi,
          { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' },
        ]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholderTextColor={colors.textMuted}
      />
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('routines.form.frequency')}
      </Text>
      <View style={[styles.row, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
        {FREQUENCIES.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, frequency === f && styles.chipOn]}
            onPress={() => setFrequency(f)}
          >
            <Text style={[styles.chipText, frequency === f && styles.chipTextOn]}>
              {t(`routines.frequency.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('routines.form.time')}
      </Text>
      <DateTimePicker
        mode="time"
        value={timeValue}
        onChange={(d) => {
          if (!d) return;
          setTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
        }}
        quickActions={false}
        showClear={false}
      />
      {frequency === 'WEEKLY' && (
        <>
          <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {t('routines.form.days')}
          </Text>
          <View style={[styles.row, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            {DAY_VALUES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, days.includes(d) && styles.chipOn]}
                onPress={() => toggleDay(d)}
              >
                <Text style={[styles.chipText, days.includes(d) && styles.chipTextOn]}>
                  {t(`routines.days.${d}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      {frequency === 'MONTHLY' && (
        <>
          <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {t('routines.form.dayOfMonth')}
          </Text>
          <TextInput
            style={[styles.input, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
            value={monthDay}
            onChangeText={setMonthDay}
            keyboardType="number-pad"
          />
        </>
      )}
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('routines.form.remindBefore')}
      </Text>
      <View style={[styles.row, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
        {REMIND_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, reminderBefore === r && styles.chipOn]}
            onPress={() => setReminderBefore(r)}
          >
            <Text style={[styles.chipText, reminderBefore === r && styles.chipTextOn]}>
              {t(`routines.remindBefore.${r}`)}
            </Text>
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
  wrap: { padding: spacing.lg, paddingBottom: 80, alignSelf: 'stretch' },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm, alignSelf: 'stretch' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignSelf: 'stretch',
  },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignSelf: 'stretch' },
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
    alignSelf: 'stretch',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  err: { color: colors.error, marginBottom: spacing.sm, alignSelf: 'stretch' },
});
