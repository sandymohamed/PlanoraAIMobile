import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useAlarmStore } from '@/store/alarmStore';
import { colors, spacing, typography } from '@/theme/tokens';

export const AlarmCreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const createAlarm = useAlarmStore((s) => s.createAlarm);
  const [title, setTitle] = useState('Alarm');
  const [when, setWhen] = useState(new Date(Date.now() + 3600000));
  const [showPicker, setShowPicker] = useState(false);

  const save = async () => {
    try {
      await createAlarm({
        title: title.trim(),
        time: when.toISOString(),
        enabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Time</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text style={{ color: colors.text }}>{when.toLocaleString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={when}
          mode="datetime"
          onChange={(_, d) => {
            if (Platform.OS === 'android') setShowPicker(false);
            if (d) setWhen(d);
          }}
        />
      )}
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
});
