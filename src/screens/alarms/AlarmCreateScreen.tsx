import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useAlarmStore } from '@/store/alarmStore';
import { alarmPermissionService } from '@/services/AlarmPermissionService';
import { openAndroidPicker } from '@/utils/dateTimePicker';
import { colors, spacing, typography } from '@/theme/tokens';

export const AlarmCreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const createAlarm = useAlarmStore((s) => s.createAlarm);
  const [title, setTitle] = useState('Alarm');
  const [when, setWhen] = useState(new Date(Date.now() + 3600000));
  const [recurrence, setRecurrence] = useState('none');
  const [showPicker, setShowPicker] = useState(false);
  const saving = useRef(false);

  const recurrenceOptions = [
    { value: 'none', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly' },
  ];

  const openPicker = () => {
    if (openAndroidPicker(when, 'datetime', setWhen)) return;
    setShowPicker(true);
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
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      saving.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Time</Text>
      <TouchableOpacity style={styles.input} onPress={openPicker}>
        <Text style={{ color: colors.text }}>{when.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && Platform.OS === 'ios' && (
        <DateTimePicker value={when} mode="datetime" onChange={(_, d) => d && setWhen(d)} />
      )}
      <Text style={styles.label}>Repeat</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
        {recurrenceOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, recurrence === opt.value && styles.chipActive]}
            onPress={() => setRecurrence(opt.value)}
          >
            <Text style={{ color: recurrence === opt.value ? '#fff' : colors.textSecondary, fontSize: 12 }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.save} onPress={save}>
        <Text style={styles.saveText}>Create alarm</Text>
      </TouchableOpacity>
    </View>
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
  save: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
