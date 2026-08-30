import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityRole,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import NativeDateTimePicker from "@react-native-community/datetimepicker";
import { addDays, isSameDay, nextSaturday, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { openAndroidPicker } from "@/utils/dateTimePicker";
import { formatDate } from "@/i18n";
import { directionalTextStyle } from "@/utils/rtl";
import { PlanoraColors, radius, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.md,
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    quickChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    quickText: { ...typography.caption, color: colors.text },
    selector: {
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.md,
    },
    selectorLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: 2,
    },
    selectorValue: { ...typography.h3, color: colors.text },
    timeToggle: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    timeToggleActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    timeToggleText: { ...typography.caption, color: colors.textSecondary },
    timeToggleTextActive: { color: colors.primary, fontWeight: "600" },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md,
    },
    helper: { ...typography.caption, color: colors.textMuted, flex: 1 },
    clear: { ...typography.caption, color: colors.error, fontWeight: "600" },
    iosPicker: {
      overflow: "hidden",
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
    },
  });

type PickerMode = "date" | "time" | "datetime";
type QuickAction = "today" | "tomorrow" | "weekend" | "nextWeek";

interface DateTimePickerProps {
  label?: string;
  value?: Date | null;
  mode: PickerMode;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  helperText?: string;
  quickActions?: boolean;
  optionalTime?: boolean;
  hasTime?: boolean;
  onHasTimeChange?: (value: boolean) => void;
  showClear?: boolean;
  clearLabel?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  "today",
  "tomorrow",
  "weekend",
  "nextWeek",
];

function dateForQuickAction(action: QuickAction) {
  const now = new Date();
  switch (action) {
    case "today":
      return startOfDay(now);
    case "tomorrow":
      return startOfDay(addDays(now, 1));
    case "weekend": {
      const saturday = nextSaturday(now);
      return startOfDay(isSameDay(saturday, now) ? addDays(now, 7) : saturday);
    }
    case "nextWeek":
      return startOfDay(addDays(now, 7));
  }
}

function mergeDateAndTime(date: Date, time: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );
}

function formatValue(
  value: Date | null | undefined,
  mode: PickerMode,
  hasTime?: boolean,
) {
  if (!value) return null;
  if (mode === "time")
    return formatDate(value, { hour: "numeric", minute: "2-digit" });
  if (mode === "date" || !hasTime) {
    return formatDate(value, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return `${formatDate(value, { weekday: "short", month: "short", day: "numeric" })} · ${formatDate(value, { hour: "numeric", minute: "2-digit" })}`;
}

function PressableRow({
  label,
  value,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const { styles } = usePlanoraStyles(createStyles);

  return (
    <TouchableOpacity
      style={[
        styles.selector,
        { alignItems: isArabic ? "flex-end" : "flex-start" },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={"button" as AccessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
    >
      <Text style={[styles.selectorLabel, directionalTextStyle()]}>
        {label}
      </Text>
      <Text style={[styles.selectorValue, directionalTextStyle()]}>
        {value}
      </Text>
    </TouchableOpacity>
  );
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  mode,
  onChange,
  placeholder,
  helperText,
  quickActions = mode !== "time",
  optionalTime = false,
  hasTime = mode === "datetime",
  onHasTimeChange,
  showClear = true,
  clearLabel,
}) => {
  const { t, i18n } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);

  const isArabic = i18n.language.startsWith("ar");
  const [selectedQuickAction, setSelectedQuickAction] =
    useState<QuickAction | null>(null);

  const [iosPickerMode, setIosPickerMode] = useState<"date" | "time" | null>(
    null,
  );
  const pickerAnim = useRef(new Animated.Value(0)).current;

  const displayValue = useMemo(
    () => formatValue(value, mode, hasTime),
    [hasTime, mode, value],
  );

  useEffect(() => {
    Animated.timing(pickerAnim, {
      toValue: iosPickerMode ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [iosPickerMode, pickerAnim]);

  const baseValue = value || new Date();

  const applyDate = (date: Date) => {
    if ((mode === "datetime" || optionalTime) && hasTime && value) {
      onChange(mergeDateAndTime(date, value));
      return;
    }
    onChange(startOfDay(date));
  };

  const applyTime = (time: Date) => {
    const baseDate = value || new Date();
    if (mode === "time") {
      onChange(time);
      return;
    }
    onChange(mergeDateAndTime(baseDate, time));
  };

  const openDatePicker = () => {
    if (openAndroidPicker(baseValue, "date", applyDate)) return;
    setIosPickerMode((current) => (current === "date" ? null : "date"));
  };

  const openTimePicker = () => {
    if (openAndroidPicker(baseValue, "time", applyTime)) return;
    setIosPickerMode((current) => (current === "time" ? null : "time"));
  };

  const openDateTimePicker = () => {
    if (mode === "time") {
      openTimePicker();
      return;
    }
    if (mode === "date" || optionalTime) {
      openDatePicker();
      return;
    }
    if (openAndroidPicker(baseValue, "datetime", onChange)) return;
    setIosPickerMode((current) => (current === "date" ? null : "date"));
  };

  const handleQuickAction = (action: QuickAction) => {
    const date = dateForQuickAction(action);
    if ((mode === "datetime" || optionalTime) && hasTime && value) {
      onChange(mergeDateAndTime(date, value));
      return;
    }
    onChange(date);
  };

  const toggleTime = () => {
    const next = !hasTime;
    onHasTimeChange?.(next);
    if (next) {
      applyTime(value || new Date());
    }
  };

  const showDateControl = mode === "date" || mode === "datetime";
  const showTimeControl =
    mode === "time" || ((mode === "datetime" || optionalTime) && hasTime);

  return (
    <View style={[styles.card]}>
      {label ? (
        <Text style={[styles.label, directionalTextStyle()]}>{label}</Text>
      ) : null}

      {quickActions && showDateControl ? (
        <View
          style={[
            styles.quickRow,
            { flexDirection: isArabic ? "row-reverse" : "row" },
          ]}
        >
          {QUICK_ACTIONS.map((action) => {
            const actionLabel = t(`common.quickActions.${action}`);
            return (
              <TouchableOpacity
                key={action}
                style={[
                  styles.quickChip,
                  selectedQuickAction === action
                    ? { borderWidth: 2, borderColor: colors.primary }
                    : undefined,
                ]}
                onPress={() => {
                  setSelectedQuickAction(action);
                  handleQuickAction(action);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t("common.setQuickDate", {
                  date: actionLabel,
                })}
              >
                <Text style={[styles.quickText, directionalTextStyle()]}>
                  {" "}
                  {actionLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
          {showClear ? (
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => onChange(null)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={clearLabel || t("common.clear")}
            >
              <Text style={[styles.quickText, directionalTextStyle()]}>
                {" "}
                {clearLabel || t("common.clear")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <PressableRow
        label={mode === "time" ? t("common.time") : t("common.customDate")}
        value={
          mode === "time"
            ? displayValue || t("common.selectTime")
            : displayValue || placeholder || t("common.chooseDate")
        }
        onPress={openDateTimePicker}
        accessibilityLabel={
          mode === "time"
            ? t("common.selectTime")
            : t("common.selectCustomDate")
        }
      />
      {optionalTime && showDateControl && value ? (
        <TouchableOpacity
          style={[styles.timeToggle, hasTime && styles.timeToggleActive]}
          onPress={toggleTime}
          activeOpacity={0.85}
          accessibilityRole="switch"
          accessibilityState={{ checked: hasTime }}
          accessibilityLabel={t("common.enableReminderTime")}
        >
          <Text
            style={[
              styles.timeToggleText,
              hasTime && styles.timeToggleTextActive,
              directionalTextStyle(),
            ]}
          >
            {hasTime ? t("common.reminderTimeOn") : t("common.addReminderTime")}
          </Text>
        </TouchableOpacity>
      ) : null}

      {showTimeControl && mode !== "time" ? (
        <PressableRow
          label={t("common.time")}
          value={
            value
              ? formatDate(value, { hour: "numeric", minute: "2-digit" })
              : t("common.selectTime")
          }
          onPress={openTimePicker}
          accessibilityLabel={t("common.selectReminderTime")}
        />
      ) : null}

      <View style={styles.footerRow}>
        {helperText ? (
          <Text style={[styles.helper, directionalTextStyle()]}>
            {helperText}
          </Text>
        ) : (
          <View />
        )}
        {showClear && value ? (
          <TouchableOpacity
            onPress={() => onChange(null)}
            accessibilityRole="button"
          >
            <Text style={[styles.clear, directionalTextStyle()]}>
              {clearLabel || t("common.clear")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {iosPickerMode && Platform.OS === "ios" ? (
        <Animated.View
          style={[
            styles.iosPicker,
            {
              opacity: pickerAnim,
              transform: [
                {
                  translateY: pickerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <NativeDateTimePicker
            value={baseValue}
            mode={iosPickerMode}
            display="spinner"
            themeVariant="dark"
            onChange={(_, picked) => {
              if (!picked) return;
              if (iosPickerMode === "date") applyDate(picked);
              else applyTime(picked);
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

export function getNextAlarmDateForTime(time: Date, customDate?: Date | null) {
  const now = new Date();
  const date = customDate || now;
  const candidate = mergeDateAndTime(date, time);
  if (customDate) return candidate;
  if (candidate.getTime() > now.getTime()) return candidate;
  return addDays(candidate, 1);
}

export function formatTimeValue(value: Date) {
  return formatDate(value, { hour: "numeric", minute: "2-digit" });
}
