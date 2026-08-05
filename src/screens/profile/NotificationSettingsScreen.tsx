import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/apiClient';
import { useRTL } from '@/hooks/useRTL';
import { colors, spacing, typography } from '@/theme/tokens';

type NotificationPrefs = {
  pushNotifications?: boolean;
  taskReminders?: boolean;
  goalReminders?: boolean;
  dueDateReminders?: boolean;
};

const TOGGLE_KEYS = [
  'pushNotifications',
  'taskReminders',
  'goalReminders',
  'dueDateReminders',
] as const;

export const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { directionalTextStyle: dirText } = useRTL();
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [loading, setLoading] = useState(true);

  const toggles = useMemo(
    () =>
      TOGGLE_KEYS.map((key) => ({
        key,
        label: t(`notificationSettings.${key}`),
        description: t(`notificationSettings.${key}Desc`),
      })),
    [t]
  );

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
    console.log(`Updating notification setting: ${key} = ${value}`);
    console.log('Next notification settings:', next);

    await apiClient.put('/me/notification-settings', next);
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={[styles.intro, dirText()]}>{t('settings.notifications')}</Text>
      {toggles.map(({ key, label, description }) => (
        <View key={key} style={styles.row}>
          <View style={styles.labelWrap}>
            <Text style={[styles.label, dirText()]}>{label}</Text>
            <Text style={[styles.description, dirText()]}>{description}</Text>
          </View>
          <Switch value={prefs[key] !== false} onValueChange={(v) => update(key, v)} />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  labelWrap: { flex: 1 },
  label: { ...typography.body, color: colors.text },
  description: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
