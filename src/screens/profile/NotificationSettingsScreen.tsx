import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/services/apiClient";
import { useRTL } from "@/hooks/useRTL";
import { colors, spacing, typography } from "@/theme/tokens";
import { useAlarmStore } from "@/store/alarmStore";
import { nativeAlarmBridge } from "@/services/NativeAlarmBridge";

type NotificationPrefs = {
  pushNotifications?: boolean;
  taskReminders?: boolean;
  goalReminders?: boolean;
  dueDateReminders?: boolean;
};

export const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { directionalTextStyle: dirText } = useRTL();

  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  const [loading, setLoading] = useState(true);

  const fetchAlarms = useAlarmStore((s) => s.fetchAlarms);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await apiClient.get<{
        success: boolean;
        data: NotificationPrefs;
      }>("/me/notification-settings");

      setPrefs(res.data || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const updatePushNotifications = async (value: boolean) => {
    const previousPrefs = prefs;
    const next = {
      ...prefs,
      pushNotifications: value,
    };

    setPrefs(next);

    try {
      await apiClient.put("/me/notification-settings", next);

      if (!value) {
        console.log("Notifications disabled → cancelling all native alarms");

        await nativeAlarmBridge.cancelAllAlarms();

        console.log("All native alarms cancelled");
      } else {
        console.log("Notifications enabled → fetching and rescheduling alarms");

        await fetchAlarms(1, 1000, true);

        console.log("Alarms fetched/rescheduled");
      }
    } catch (error) {
      console.error("Failed to update notification settings", error);

      // Roll back UI if the request/native operation failed
      setPrefs(previousPrefs);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
    );
  }

  const notificationsEnabled = prefs.pushNotifications !== false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <Text style={[styles.intro, dirText()]}>
        {t("settings.notifications")}
      </Text>

      <View style={styles.settingRow}>
        <View style={styles.textContainer}>
          <Text style={[styles.label, dirText()]}>
            {t("notificationSettings.notificationsAndAlarms")}
          </Text>

          <Text style={[styles.description, dirText()]}>
            {t("notificationSettings.notificationsAndAlarmsDesc")}
          </Text>
        </View>

        <Switch
          value={notificationsEnabled}
          onValueChange={updatePushNotifications}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  intro: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },

  textContainer: {
    flex: 1,
  },

  label: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },

  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
