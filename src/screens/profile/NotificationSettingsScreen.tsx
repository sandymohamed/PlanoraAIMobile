import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '@/services/apiClient';
import { colors, spacing, typography } from '@/theme/tokens';

type NotificationPrefs = {
  pushNotifications?: boolean;
  taskReminders?: boolean;
  goalReminders?: boolean;
  dueDateReminders?: boolean;
  weeklyDigest?: boolean;
};

const TOGGLES: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'pushNotifications', label: 'Push notifications' },
  { key: 'taskReminders', label: 'Task reminders' },
  { key: 'goalReminders', label: 'Goal reminders' },
  { key: 'dueDateReminders', label: 'Due date reminders' },
  { key: 'weeklyDigest', label: 'Weekly digest email' },
];

export const NotificationSettingsScreen: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: NotificationPrefs }>('/me/notification-settings');
      setPrefs(res.data || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const update = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await apiClient.put('/me/notification-settings', next);
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {TOGGLES.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Switch value={prefs[key] !== false} onValueChange={(v) => update(key, v)} />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  label: { ...typography.body, color: colors.text },
});
