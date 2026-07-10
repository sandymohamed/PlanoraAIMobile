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
import { useTranslation } from 'react-i18next';
import { useAlarmStore } from '@/store/alarmStore';
import { nativeAlarmBridge } from '@/services/NativeAlarmBridge';
import { showAlert, showError } from '@/components/ConfirmationDialog';
import { colors, spacing, typography } from '@/theme/tokens';
import { DateTimePicker, formatTimeValue, getNextAlarmDateForTime } from '@/components/ui/DateTimePicker';
import { format, isToday, isTomorrow } from 'date-fns';

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekdays', 'weekends', 'weekly'] as const;

export const AlarmEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const alarmId = route.params?.alarmId as string;
  const { alarms, updateAlarm } = useAlarmStore();
  const alarm = alarms.find((a) => a.id === alarmId);

  const [title, setTitle] = useState('');
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [ringtoneName, setRingtoneName] = useState(t('alarms.form.defaultRingtone'));
  const saving = useRef(false);

  const when = useMemo(() => getNextAlarmDateForTime(alarmTime, customDate), [alarmTime, customDate]);
  const dateLabel = customDate
    ? format(when, 'EEE, MMM d')
    : isToday(when)
      ? t('common.today')
      : isTomorrow(when)
        ? t('common.tomorrow')
        : format(when, 'EEE, MMM d');

  useEffect(() => {
    if (!alarm) return;
    setTitle(alarm.title);
    const alarmDate = new Date(alarm.time);
    setAlarmTime(alarmDate);
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
      showAlert(t('alarms.form.soundTitle'), t('alarms.form.soundAndroidOnly'));
      return;
    }
    try {
      const uri = await nativeAlarmBridge.pickRingtone();
      if (!uri) return;
      setRingtoneUri(uri);
      const name = await nativeAlarmBridge.getRingtoneTitle(uri);
      setRingtoneName(name || t('alarms.form.customRingtone'));
    } catch (e: any) {
      if (!String(e?.message).includes('CANCELLED')) {
        showError(t('common.error'), e?.message || t('alarms.form.pickRingtoneError'));
      }
    }
  };

  const save = async () => {
    if (!alarm || saving.current) return;
    if (!title.trim()) {
      showAlert(t('alarms.form.titleRequired'), t('alarms.form.titleRequiredMessage'), { variant: 'warning' });
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
      showError(t('common.error'), e.message);
    } finally {
      saving.current = false;
    }
  };

  if (!alarm) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {t('alarms.form.notFound')}
        </Text>
        <TouchableOpacity style={styles.save} onPress={() => navigation.goBack()}>
          <Text style={[styles.saveText, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {t('alarms.form.goBack')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('alarms.form.title')}
      </Text>
      <TextInput
        style={[styles.input, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.timeHero}>
        <Text style={[styles.heroLabel, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {t('alarms.form.alarmTime')}
        </Text>
        <Text style={[styles.heroTime, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {formatTimeValue(alarmTime)}
        </Text>
        <Text style={[styles.heroDate, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {t('alarms.form.scheduledFor', { date: dateLabel, fullDate: format(when, 'MMM d, yyyy') })}
        </Text>
      </View>

      <DateTimePicker
        mode="time"
        value={alarmTime}
        onChange={(date) => date && setAlarmTime(date)}
        label={t('alarms.form.selectTime')}
        quickActions={false}
        showClear={false}
      />

      <TouchableOpacity
        style={styles.customDateButton}
        onPress={() => setShowCustomDate((v) => !v)}
        activeOpacity={0.85}
      >
        <Text style={[styles.customDateText, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {showCustomDate ? t('alarms.form.hideCustomDate') : t('alarms.form.customDate')}
        </Text>
      </TouchableOpacity>

      {showCustomDate ? (
        <DateTimePicker
          mode="date"
          value={customDate}
          onChange={setCustomDate}
          label={t('alarms.form.customAlarmDate')}
          placeholder={t('alarms.form.autoDatePlaceholder')}
          helperText={t('alarms.form.autoDateHelperEdit')}
          clearLabel={t('alarms.form.useAutoDate')}
          showClear={Boolean(customDate)}
        />
      ) : null}

      {Platform.OS === 'android' && (
        <>
          <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {t('alarms.form.alarmSound')}
          </Text>
          <TouchableOpacity style={styles.input} onPress={pickRingtone}>
            <Text style={{ color: colors.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>
              {ringtoneName}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={[styles.label, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
        {t('alarms.form.repeat')}
      </Text>
      <View style={[styles.recurrenceRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
        {RECURRENCE_OPTIONS.map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, recurrence === value && styles.chipActive]}
            onPress={() => setRecurrence(value)}
          >
            <Text style={[styles.chipText, recurrence === value && styles.chipTextActive, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
              {t(`alarms.recurrence.${value}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.save} onPress={save}>
        <Text style={[styles.saveText, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
          {t('alarms.form.saveChanges')}
        </Text>
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
  recurrenceRow: { flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
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
