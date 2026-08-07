import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "@/theme/tokens";

type ActiveAlarmBannerProps = {
  alarm: any;
  alarmId?: string | null;
  onStop: () => void;
  onSnooze: () => void;
  onPress: () => void;
};

export const ActiveAlarmBanner: React.FC<ActiveAlarmBannerProps> = ({
  alarm,
  alarmId,
  onStop,
  onSnooze,
  onPress,
}) => {
  if (!alarm && !alarmId) {
    console.log("ActiveAlarmBanner: no active alarm to display");
    return null;
  }

  const title = alarm?.title || "Alarm";
  const time = alarm?.time
    ? new Date(alarm.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.content}
      >
        <View style={styles.iconContainer}>
          <Icon
            name="alarm"
            size={24}
            color={colors.primary}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.label}>Alarm is ringing</Text>

          <Text
            style={styles.title}
            numberOfLines={1}
          >
            {title}
          </Text>

          {time && (
            <Text style={styles.time}>
              {time}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.snoozeButton}
          onPress={onSnooze}
        >
          <Icon
            name="clock-outline"
            size={18}
            color={colors.text}
          />

          <Text style={styles.snoozeText}>
            Snooze
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stopButton}
          onPress={onStop}
        >
          <Icon
            name="stop"
            size={18}
            color={colors.background}
          />

          <Text style={styles.stopText}>
            Stop
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
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
    backgroundColor: colors.background,
    marginRight: 12,
  },

  info: {
    flex: 1,
  },

  label: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },

  time: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },

  snoozeButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.background,
  },

  snoozeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  stopButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
  },

  stopText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "700",
  },
});