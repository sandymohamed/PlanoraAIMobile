import { colors, shadows } from "@/theme/tokens";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ActiveAlarm {
  alarmId: string;
  title: string;
}

interface ActiveAlarmBannerProps {
  alarm: ActiveAlarm;
  onStop: () => void | Promise<void>;
  onSnooze: () => void | Promise<void>;
  onPress?: () => void;
}

export function ActiveAlarmBanner({
  alarm,
  onStop,
  onSnooze,
  onPress,
}: ActiveAlarmBannerProps) {
  console.log("Rendering ActiveAlarmBanner with alarm:", alarm);

  // const isFocusTimer = alarm.alarmId === "focus_timer";
  const isFocusTimer = false;
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.content}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏰</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.label}>ALARM</Text>

          <Text style={styles.title} numberOfLines={1}>
            {alarm.title}
          </Text>

          <Text style={styles.status}>Alarm is ringing</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onStop}
          style={[styles.button, styles.stopButton]}
        >
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
        {!isFocusTimer && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSnooze}
            style={[styles.button, styles.snoozeButton]}
          >
            <Text style={styles.snoozeText}>Snooze</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.surfaceElevated,

    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E5",
    marginRight: 12,
  },

  icon: {
    fontSize: 22,
  },

  info: {
    flex: 1,
  },

  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#888888",
    marginBottom: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  status: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  button: {
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  snoozeButton: {
    width: 96,
    height: 48,
    backgroundColor: colors.warning,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },

  stopButton: {
    flex: 1,

    borderRadius: 999,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },

  snoozeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },

  stopText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});
