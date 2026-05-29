import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useAlarmStore } from '@/store/alarmStore';
import { alarmPermissionService } from '@/services/AlarmPermissionService';
import { nativeAlarmBridge } from '@/services/NativeAlarmBridge';
import { openAndroidPicker } from '@/utils/dateTimePicker';
import { colors, spacing, typography } from '@/theme/tokens';

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly', label: 'Weekly' },
];

export const AlarmCreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const createAlarm = useAlarmStore((s) => s.createAlarm);
  const [title, setTitle] = useState('Alarm');
  const [when, setWhen] = useState(new Date(Date.now() + 3600000));
  const [recurrence, setRecurrence] = useState('none');
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [ringtoneName, setRingtoneName] = useState('Default alarm');
  const [showPicker, setShowPicker] = useState(false);
  const saving = useRef(false);

  const openPicker = () => {
    if (openAndroidPicker(when, 'datetime', setWhen)) return;
    setShowPicker(true);
  };

  const pickRingtone = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Alarm sound', 'Custom ringtones are available on Android.');
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
        Alert.alert('Error', e?.message || 'Could not pick ringtone');
      }
    }
  };

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      await alarmPermissionService.requestAllPermissions();
      await createAlarm({
        title: title.trim(),
        time: when.toISOString(),
        enabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrenceRule: recurrence === 'none' ? undefined : recurrence,
        toneUrl: ringtoneUri || undefined,
        snoozeConfig: { duration: 5, maxSnoozes: 3 },
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      saving.current = false;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Time</Text>
      <TouchableOpacity style={styles.input} onPress={openPicker}>
        <Text style={{ color: colors.text }}>{when.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && Platform.OS === 'ios' && (
        <DateTimePicker value={when} mode="datetime" onChange={(_, d) => d && setWhen(d)} />
      )}
      {Platform.OS === 'android' && (
        <>
          <Text style={styles.label}>Alarm sound</Text>
          <TouchableOpacity style={styles.input} onPress={pickRingtone}>
            <Text style={{ color: colors.text }}>{ringtoneName}</Text>
          </TouchableOpacity>
        </>
      )}
      <Text style={styles.label}>Repeat</Text>
      <View style={styles.chipRow}>
        {RECURRENCE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, recurrence === opt.value && styles.chipActive]}
            onPress={() => setRecurrence(opt.value)}
          >
            <Text style={[styles.chipText, recurrence === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>Snooze: 5 min from notification (up to 3 times)</Text>
      <TouchableOpacity style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Create alarm</Text>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
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
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  save: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
