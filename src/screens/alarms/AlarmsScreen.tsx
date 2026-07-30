import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { AppIcon as Icon } from "@/components/ui/AppIcon";
import { useAlarmStore } from "@/store/alarmStore";
import { alarmFixService } from "@/services/AlarmFixService";
import { alarmPermissionService } from "@/services/AlarmPermissionService";
import {
  groupAlarmsByRecurrence,
  getAlarmStatus,
  statusColor,
  isAlarmExpired,
} from "@/utils/alarmUi";
import { validateAndCleanPendingState } from "@/utils/alarmCleanup";
import {
  showDeleteConfirmation,
  showError,
} from "@/components/ConfirmationDialog";
import { colors, spacing, typography } from "@/theme/tokens";
import { format } from "date-fns";
import { getApiErrorMessage } from "@/utils/apiError";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { AnalyticsEvents } from "@/analytics/posthog";

export const AlarmsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const {
    alarms,
    timers,
    loading,
    fetchAlarms,
    fetchTimers,
    toggleAlarm,
    deleteAlarm,
    cleanupExpiredAlarms,
  } = useAlarmStore();

  useScreenAnalytics(AnalyticsEvents.ALARMS_OPENED);

  // Hide one-time alarms that have already rung — only keep alarms that will ring in the future.
  const visibleAlarms = alarms;
  //  alarms.filter((a) => !isAlarmExpired(a));

  useFocusEffect(
    useCallback(() => {
      alarmFixService.initialize().catch(() => {});
      alarmPermissionService.showPermissionSetupDialog().catch(() => {});
      // Fetch, then permanently delete expired one-time alarms so they don't pile up in the DB.
      fetchAlarms(1, 100, undefined)
        .then(() => cleanupExpiredAlarms())
        .catch(() => {});
      fetchTimers(1, 50);
    }, [fetchAlarms, fetchTimers, cleanupExpiredAlarms]),
  );

  useEffect(() => {
    validateAndCleanPendingState(alarms, timers).catch(() => {});
  }, [alarms, timers]);

  const onToggle = async (id: string) => {
    try {
      await toggleAlarm(id);
    } catch (e: any) {
      showError(t("common.error"), e.message);
    }
  };

  const onDelete = (id: string, title: string) => {
    showDeleteConfirmation(
      title,
      async () => {
        try {
          await deleteAlarm(id);
        } catch (e) {
          showError(t("common.error"), getApiErrorMessage(e));
        }
      },
      t("navigation.alarm"),
    );
  };

  return (
    <View style={styles.container}>
      {loading && visibleAlarms.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              styles.title,
              {
                textAlign: isArabic ? "right" : "left",
                writingDirection: isArabic ? "rtl" : "ltr",
              },
            ]}
          >
            {t("alarms.screen.title")}
          </Text>
          <Text
            style={[
              styles.sub,
              {
                textAlign: isArabic ? "right" : "left",
                writingDirection: isArabic ? "rtl" : "ltr",
              },
            ]}
          >
            {t("alarms.screen.subtitle")}
          </Text>

          <TouchableOpacity
            style={[
              styles.permBanner,
              { flexDirection: isArabic ? "row-reverse" : "row" },
            ]}
            onPress={() => alarmPermissionService.requestAllPermissions()}
          >
            <Icon
              name="shield-check-outline"
              size={18}
              color={colors.primary}
            />
            <View style={styles.permBody}>
              <Text
                style={[
                  styles.permText,
                  {
                    textAlign: isArabic ? "right" : "left",
                    writingDirection: isArabic ? "rtl" : "ltr",
                  },
                ]}
              >
                {t("alarms.verifyPermissions")}
              </Text>
              <Text
                style={[
                  styles.permSub,
                  {
                    textAlign: isArabic ? "right" : "left",
                    writingDirection: isArabic ? "rtl" : "ltr",
                  },
                ]}
              >
                {t("alarms.verifyPermissionsDesc")}
              </Text>
            </View>
          </TouchableOpacity>

          {groupAlarmsByRecurrence(visibleAlarms).map((group) => (
            <View key={group.key}>
              <Text
                style={[
                  styles.section,
                  {
                    textAlign: isArabic ? "right" : "left",
                    writingDirection: isArabic ? "rtl" : "ltr",
                  },
                ]}
              >
                {t(`alarms.recurrence.group.${group.key}`)} (
                {group.items.length})
              </Text>
              {group.items.map((item) => {
                const status = getAlarmStatus(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.row,
                      { flexDirection: isArabic ? "row-reverse" : "row" },
                      !item.enabled && styles.rowDisabled,
                    ]}
                    onPress={() =>
                      navigation.navigate("AlarmEdit", { alarmId: item.id })
                    }
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor(status) },
                      ]}
                    />
                    <View style={styles.rowBody}>
                      <Text
                        style={[
                          styles.rowTitle,
                          !item.enabled && styles.textMuted,
                          {
                            textAlign: isArabic ? "right" : "left",
                            writingDirection: isArabic ? "rtl" : "ltr",
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          styles.rowMeta,
                          {
                            textAlign: isArabic ? "right" : "left",
                            writingDirection: isArabic ? "rtl" : "ltr",
                          },
                        ]}
                      >
                        {format(new Date(item.time), "EEE MMM d · h:mm a")}
                        {status === "soon"
                          ? ` · ${t("alarms.screen.soon")}`
                          : ""}
                        {status === "past"
                          ? ` · ${t("alarms.screen.past")}`
                          : ""}
                      </Text>
                    </View>
                    <Switch
                      value={item.enabled}
                      onValueChange={() => onToggle(item.id)}
                    />
                    <TouchableOpacity
                      onPress={() => onDelete(item.id, item.title)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Icon
                        name="trash-can-outline"
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {visibleAlarms.length === 0 && (
            <Text
              style={[
                styles.empty,
                {
                  textAlign: isArabic ? "right" : "left",
                  writingDirection: isArabic ? "rtl" : "ltr",
                },
              ]}
            >
              {t("alarms.screen.empty")}
            </Text>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AlarmCreate")}
      >
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...typography.h1, color: colors.text },
  sub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  permBanner: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  permBody: { flex: 1 },
  permText: { ...typography.body, color: colors.primary, fontWeight: "600" },
  permSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  section: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowDisabled: { opacity: 0.65 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: "600" },
  textMuted: { color: colors.textMuted },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  fab: {
    position: "absolute",
    end: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});
