import React, { useEffect, useRef, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAlarmStore } from '@/store/alarmStore';
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

export const AlarmEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const alarmId = route.params?.alarmId as string;
  const { alarms, updateAlarm } = useAlarmStore();
  const alarm = alarms.find((a) => a.id === alarmId);

  const timeRef = useRef(new Date());
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(new Date());
  const [recurrence, setRecurrence] = useState('none');
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [ringtoneName, setRingtoneName] = useState('Default alarm');
  const [showPicker, setShowPicker] = useState(false);
  const saving = useRef(false);

  useEffect(() => {
    if (!alarm) return;
    setTitle(alarm.title);
    const t = new Date(alarm.time);
    timeRef.current = t;
    setWhen(t);
    setRecurrence(alarm.recurrenceRule || 'none');
    if (alarm.toneUrl) {
      setRingtoneUri(alarm.toneUrl);
      if (Platform.OS === 'android') {
        nativeAlarmBridge.getRingtoneTitle(alarm.toneUrl).then((n) => n && setRingtoneName(n)).catch(() => {});
      }
    }
  }, [alarm]);

  const openPicker = () => {
    if (openAndroidPicker(when, 'time', (d) => {
      timeRef.current = d;
      setWhen(d);
    })) {
      return;
    }
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
    if (!alarm || saving.current) return;
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter an alarm title.');
      return;
    }
    saving.current = true;
    try {
      await updateAlarm(alarm.id, {
        title: title.trim(),
        time: timeRef.current.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recurrenceRule: recurrence === 'none' ? undefined : recurrence,
        toneUrl: ringtoneUri || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
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

      <Text style={styles.label}>Time</Text>
      <TouchableOpacity style={styles.input} onPress={openPicker}>
        <Text style={{ color: colors.text }}>
          {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </TouchableOpacity>
      {showPicker && Platform.OS === 'ios' && (
        <DateTimePicker
          mode="time"
          value={when}
          onChange={(_, d) => {
            if (d) {
              timeRef.current = d;
              setWhen(d);
            }
            setShowPicker(false);
          }}
        />
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
