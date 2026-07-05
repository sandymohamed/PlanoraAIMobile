import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAlarmStore } from '@/store/alarmStore';
import { nativeAlarmBridge } from '@/services/NativeAlarmBridge';
import { showAlert, showError } from '@/components/ConfirmationDialog';
import { colors, spacing, typography } from '@/theme/tokens';
import { DateTimePicker, formatTimeValue, getNextAlarmDateForTime } from '@/components/ui/DateTimePicker';
import { format, isToday, isTomorrow } from 'date-fns';

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly', label: 'Weekly' },
];

export const AlarmEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const alarmId = route.params?.alarmId as string;
  const { alarms, updateAlarm } = useAlarmStore();
  const alarm = alarms.find((a) => a.id === alarmId);

  const [title, setTitle] = useState('');
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [ringtoneName, setRingtoneName] = useState('Default alarm');
  const saving = useRef(false);

  const when = useMemo(() => getNextAlarmDateForTime(alarmTime, customDate), [alarmTime, customDate]);
  const dateLabel = customDate
    ? format(when, 'EEE, MMM d')
    : isToday(when)
      ? 'Today'
      : isTomorrow(when)
        ? 'Tomorrow'
        : format(when, 'EEE, MMM d');

  useEffect(() => {
    if (!alarm) return;
    setTitle(alarm.title);
    const t = new Date(alarm.time);
    setAlarmTime(t);
    setCustomDate(null);
    setShowCustomDate(false);
    setRecurrence(alarm.recurrenceRule || 'none');
    if (alarm.toneUrl) {
      setRingtoneUri(alarm.toneUrl);
      if (Platform.OS === 'android') {
        nativeAlarmBridge.getRingtoneTitle(alarm.toneUrl).then((n) => n && setRingtoneName(n)).catch(() => {});
      }
    }
  }, [alarm]);

  const pickRingtone = async () => {
    if (Platform.OS !== 'android') {
      showAlert('Alarm sound', 'Custom ringtones are available on Android.');
      return;
    }
    try {
      const uri = await nativeAlarmBridge.pickRingtone();
      if (!uri) return;
      setRingtoneUri(uri);
      const name = await nativeAlarmBridge.getRingtoneTitle(uri);
      setRingtoneName(name || 'Custom ringtone');
    } catch (e: any) {
      if (!String(e?.message).includes('CANCELLED')) {
        showError('Error', e?.message || 'Could not pick ringtone');
      }
    }
  };

  const save = async () => {
    if (!alarm || saving.current) return;
    if (!title.trim()) {
      showAlert('Title required', 'Please enter an alarm title.', { variant: 'warning' });
      return;
    }
    saving.current = true;
    try {
      await updateAlarm(alarm.id, {
        title: title.trim(),
        time: when.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrenceRule: recurrence === 'none' ? undefined : recurrence,
        toneUrl: ringtoneUri || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      showError('Error', e.message);
    } finally {
      saving.current = false;
    }
  };

  if (!alarm) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Alarm not found</Text>
        <TouchableOpacity style={styles.save} onPress={() => navigation.goBack()}>
          <Text style={styles.saveText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />

      <View style={styles.timeHero}>
        <Text style={styles.heroLabel}>Alarm time</Text>
        <Text style={styles.heroTime}>{formatTimeValue(alarmTime)}</Text>
        <Text style={styles.heroDate}>Scheduled for {dateLabel} · {format(when, 'MMM d, yyyy')}</Text>
      </View>

      <DateTimePicker
        mode="time"
        value={alarmTime}
        onChange={(date) => date && setAlarmTime(date)}
        label="Select time"
        quickActions={false}
        showClear={false}
      />

      <TouchableOpacity
        style={styles.customDateButton}
        onPress={() => setShowCustomDate((v) => !v)}
        activeOpacity={0.85}
      >
        <Text style={styles.customDateText}>{showCustomDate ? 'Hide custom date' : 'Custom Date'}</Text>
      </TouchableOpacity>

      {showCustomDate ? (
        <DateTimePicker
          mode="date"
          value={customDate}
          onChange={setCustomDate}
          label="Custom alarm date"
          placeholder="Automatic today/tomorrow"
          helperText="Clear it to automatically use today or tomorrow based on the selected time."
          clearLabel="Use automatic date"
          showClear={Boolean(customDate)}
        />
      ) : null}

      {Platform.OS === 'android' && (
        <>
          <Text style={styles.label}>Alarm sound</Text>
          <TouchableOpacity style={styles.input} onPress={pickRingtone}>
            <Text style={{ color: colors.text }}>{ringtoneName}</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.label}>Repeat</Text>
      <View style={styles.recurrenceRow}>
        {RECURRENCE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, recurrence === opt.value && styles.chipActive]}
            onPress={() => setRecurrence(opt.value)}
          >
            <Text style={[styles.chipText, recurrence === opt.value && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Save changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  timeHero: {
    marginTop: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  heroLabel: { ...typography.label, color: colors.primary, textTransform: 'uppercase' },
  heroTime: { fontSize: 44, fontWeight: '700', color: colors.text, letterSpacing: -1, marginTop: spacing.xs },
  heroDate: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  customDateButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  customDateText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  save: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
