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
import {
  addDays,
  isSameDay,
  nextSaturday,
  startOfDay,
} from "date-fns";
import { useTranslation } from "react-i18next";

import { openAndroidPicker } from "@/utils/dateTimePicker";
import { formatDate } from "@/i18n";
import { directionalTextStyle } from "@/utils/rtl";
import {
  PlanoraColors,
  radius,
  spacing,
  typography,
} from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    // -----------------------------------------------------------------------
    // Container
    // -----------------------------------------------------------------------

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: spacing.md,
      gap: spacing.sm,
    },

    // -----------------------------------------------------------------------
    // Label
    // -----------------------------------------------------------------------

    label: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: 2,
    },

    // -----------------------------------------------------------------------
    // Quick actions
    // -----------------------------------------------------------------------

    quickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },

    quickChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },

    quickChipSelected: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },

    quickText: {
      ...typography.caption,
      color: colors.text,
      fontWeight: "500",
    },

    quickTextSelected: {
      color: colors.primary,
      fontWeight: "700",
    },

    // -----------------------------------------------------------------------
    // Main picker selector
    // -----------------------------------------------------------------------

    selector: {
      minHeight: 68,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },

    selectorPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },

    selectorIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    selectorContent: {
      flex: 1,
      minWidth: 0,
    },

    selectorLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: 3,
    },

    selectorValue: {
      ...typography.body,
      color: colors.text,
      fontWeight: "600",
    },

    selectorPlaceholder: {
      color: colors.textSecondary,
      fontWeight: "500",
    },

    selectorChevron: {
      flexShrink: 0,
    },

    // -----------------------------------------------------------------------
    // Optional time toggle
    // -----------------------------------------------------------------------

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

    timeToggleText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    timeToggleTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },

    // -----------------------------------------------------------------------
    // Footer
    // -----------------------------------------------------------------------

    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 20,
    },

    helper: {
      ...typography.caption,
      color: colors.textMuted,
      flex: 1,
      lineHeight: 17,
    },

    clear: {
      ...typography.caption,
      color: colors.error,
      fontWeight: "600",
    },

    // -----------------------------------------------------------------------
    // iOS inline picker
    // -----------------------------------------------------------------------

    iosPicker: {
      overflow: "hidden",
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      marginTop: spacing.xs,
    },
  });

type PickerMode = "date" | "time" | "datetime";

type QuickAction =
  | "today"
  | "tomorrow"
  | "weekend"
  | "nextWeek";

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

      return startOfDay(
        isSameDay(saturday, now)
          ? addDays(now, 7)
          : saturday,
      );
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

// function formatValue(
//   value: Date | null | undefined,
//   mode: PickerMode,
//   hasTime?: boolean,
// ) {
//   if (!value) return null;

//     if (mode === "time") {
//     return formatDate(value, {
//       hour: "numeric",
//       minute: "2-digit",
//     });
//   }
//   // if (mode === "time") {
//   //   return formatDate(value, {
//   //     hour: "numeric",
//   //     minute: "2-digit",
//   //   });
//   // }

//   if (mode === "date" || !hasTime) {
//     return formatDate(value, {
//       weekday: "short",
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     });
//   }

//   return `${formatDate(value, {
//     weekday: "short",
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   })} · ${formatDate(value, {
//     hour: "numeric",
//     minute: "2-digit",
//   })}`;
// }

function formatValue(
  value: Date | null | undefined,
  mode: PickerMode,
  hasTime?: boolean,
) {
  if (!value) return null;

  // Time-only picker
  // Important for routines/habits where the Date object is only
  // being used as a container for local hours/minutes.
  if (mode === "time") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  }

  if (mode === "date" || !hasTime) {
    return formatDate(value, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return `${formatDate(value, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${formatDate(value, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
// ============================================================================
// PICKER SELECTOR
// ============================================================================

interface PressableRowProps {
  label: string;
  value: string;
  hasValue: boolean;
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

const PressableRow: React.FC<PressableRowProps> = ({
  label,
  value,
  hasValue,
  icon,
  onPress,
  accessibilityLabel,
}) => {
  const { i18n } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);

  const isArabic = i18n.language.startsWith("ar");

  const [pressed, setPressed] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.selector,
        pressed && styles.selectorPressed,
      ]}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      activeOpacity={0.9}
      accessibilityRole={"button" as AccessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={
        isArabic
          ? "اضغط لفتح أداة اختيار التاريخ"
          : "Tap to open the date picker"
      }
    >
      <View style={styles.selectorIcon}>
        <Icon
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <View
        style={[
          styles.selectorContent,
          {
            alignItems: isArabic
              ? "flex-end"
              : "flex-start",
          },
        ]}
      >
        <Text
          style={[
            styles.selectorLabel,
            directionalTextStyle(),
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.selectorValue,
            !hasValue && styles.selectorPlaceholder,
            directionalTextStyle(),
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>

      <Icon
        name={isArabic ? "chevron-left" : "chevron-right"}
        size={24}
        color={colors.textMuted}
        style={styles.selectorChevron}
      />
    </TouchableOpacity>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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

  const [iosPickerMode, setIosPickerMode] = useState<
    "date" | "time" | null
  >(null);

  const pickerAnim = useRef(
    new Animated.Value(0),
  ).current;

  // -------------------------------------------------------------------------
  // Display value
  // -------------------------------------------------------------------------

  // const displayValue = useMemo(
  //   () => formatValue(value, mode, hasTime),
  //   [hasTime, mode, value],
  // );

  const displayValue = formatValue(value, mode, hasTime);
  // -------------------------------------------------------------------------
  // Picker animation
  // -------------------------------------------------------------------------

  useEffect(() => {
    Animated.timing(pickerAnim, {
      toValue: iosPickerMode ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [iosPickerMode, pickerAnim]);

  // -------------------------------------------------------------------------
  // Base value
  // -------------------------------------------------------------------------

  const baseValue = value || new Date();

  // -------------------------------------------------------------------------
  // Date / time changes
  // -------------------------------------------------------------------------

  const applyDate = (date: Date) => {
    if (
      (mode === "datetime" || optionalTime) &&
      hasTime &&
      value
    ) {
      onChange(mergeDateAndTime(date, value));
      return;
    }

    onChange(startOfDay(date));
  };

  // const applyTime = (time: Date) => {
  //   const baseDate = value || new Date();

  //   if (mode === "time") {
  //     onChange(time);
  //     return;
  //   }

  //   onChange(mergeDateAndTime(baseDate, time));
  // };

  const applyTime = (time: Date) => {
  if (mode === "time") {
    // Preserve the selected local time exactly.
    onChange(new Date(
      1970,
      0,
      1,
      time.getHours(),
      time.getMinutes(),
      0,
      0,
    ));
    return;
  }

  const baseDate = value || new Date();

  onChange(mergeDateAndTime(baseDate, time));
};
  // -------------------------------------------------------------------------
  // Open picker
  // -------------------------------------------------------------------------

  const openDatePicker = () => {
    if (
      openAndroidPicker(
        baseValue,
        "date",
        applyDate,
      )
    ) {
      return;
    }

    setIosPickerMode((current) =>
      current === "date" ? null : "date",
    );
  };

  const openTimePicker = () => {
    if (
      openAndroidPicker(
        baseValue,
        "time",
        applyTime,
      )
    ) {
      return;
    }

    setIosPickerMode((current) =>
      current === "time" ? null : "time",
    );
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

    if (
      openAndroidPicker(
        baseValue,
        "datetime",
        onChange,
      )
    ) {
      return;
    }

    setIosPickerMode((current) =>
      current === "date" ? null : "date",
    );
  };

  // -------------------------------------------------------------------------
  // Quick actions
  // -------------------------------------------------------------------------

  const handleQuickAction = (
    action: QuickAction,
  ) => {
    const date = dateForQuickAction(action);

    if (
      (mode === "datetime" || optionalTime) &&
      hasTime &&
      value
    ) {
      onChange(
        mergeDateAndTime(date, value),
      );
      return;
    }

    onChange(date);
  };

  // -------------------------------------------------------------------------
  // Optional time
  // -------------------------------------------------------------------------

  const toggleTime = () => {
    const next = !hasTime;

    onHasTimeChange?.(next);

    if (next) {
      applyTime(value || new Date());
    }
  };

  // -------------------------------------------------------------------------
  // Visibility
  // -------------------------------------------------------------------------

  const showDateControl =
    mode === "date" || mode === "datetime";

  const showTimeControl =
    mode === "time" ||
    ((mode === "datetime" || optionalTime) &&
      hasTime);

  // -------------------------------------------------------------------------
  // Labels
  // -------------------------------------------------------------------------

  const selectorLabel =
    mode === "time"
      ? t("common.time")
      : label ||
        t("common.customDate");

  const selectorPlaceholder =
    mode === "time"
      ? t("common.selectTime")
      : placeholder ||
        t("common.chooseDate");

  const selectorValue =
    displayValue || selectorPlaceholder;

  const selectorIcon =
    mode === "time"
      ? "clock-outline"
      : "calendar-month-outline";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.card}>
      {/* ----------------------------------------------------------------- */}
      {/* Label */}
      {/* ----------------------------------------------------------------- */}

      {label ? (
        <Text
          style={[
            styles.label,
            directionalTextStyle(),
          ]}
        >
          {label}
        </Text>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* Quick actions */}
      {/* ----------------------------------------------------------------- */}

      {quickActions && showDateControl ? (
        <View
          style={[
            styles.quickRow,
            {
              flexDirection: isArabic
                ? "row-reverse"
                : "row",
            },
          ]}
        >
          {QUICK_ACTIONS.map((action) => {
            const actionLabel = t(
              `common.quickActions.${action}`,
            );

            const selected =
              selectedQuickAction === action;

            return (
              <TouchableOpacity
                key={action}
                style={[
                  styles.quickChip,
                  selected &&
                    styles.quickChipSelected,
                ]}
                onPress={() => {
                  setSelectedQuickAction(
                    action,
                  );

                  handleQuickAction(
                    action,
                  );
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t(
                  "common.setQuickDate",
                  {
                    date: actionLabel,
                  },
                )}
              >
                <Text
                  style={[
                    styles.quickText,
                    selected &&
                      styles.quickTextSelected,
                    directionalTextStyle(),
                  ]}
                >
                  {actionLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* Main picker */}
      {/* ----------------------------------------------------------------- */}

      <PressableRow
        label={selectorLabel}
        value={selectorValue}
        hasValue={Boolean(value)}
        icon={selectorIcon}
        onPress={openDateTimePicker}
        accessibilityLabel={
          mode === "time"
            ? t("common.selectTime")
            : t("common.selectCustomDate")
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Optional time */}
      {/* ----------------------------------------------------------------- */}

      {optionalTime &&
      showDateControl &&
      value ? (
        <TouchableOpacity
          style={[
            styles.timeToggle,
            hasTime &&
              styles.timeToggleActive,
          ]}
          onPress={toggleTime}
          activeOpacity={0.85}
          accessibilityRole="switch"
          accessibilityState={{
            checked: hasTime,
          }}
          accessibilityLabel={t(
            "common.enableReminderTime",
          )}
        >
          <Text
            style={[
              styles.timeToggleText,
              hasTime &&
                styles.timeToggleTextActive,
              directionalTextStyle(),
            ]}
          >
            {hasTime
              ? t(
                  "common.reminderTimeOn",
                )
              : t(
                  "common.addReminderTime",
                )}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* Time selector */}
      {/* ----------------------------------------------------------------- */}

      {showTimeControl &&
      mode !== "time" ? (
        <PressableRow
          label={t("common.time")}
          value={
            value
              ? formatDate(value, {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : t("common.selectTime")
          }
          hasValue={Boolean(value)}
          icon="clock-outline"
          onPress={openTimePicker}
          accessibilityLabel={t(
            "common.selectReminderTime",
          )}
        />
      ) : null}

      {/* ----------------------------------------------------------------- */}
      {/* Helper + clear */}
      {/* ----------------------------------------------------------------- */}

      <View style={styles.footerRow}>
        {helperText ? (
          <Text
            style={[
              styles.helper,
              directionalTextStyle(),
            ]}
          >
            {helperText}
          </Text>
        ) : (
          <View />
        )}

        {showClear && value ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedQuickAction(
                null,
              );
              onChange(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              clearLabel ||
              t("common.clear")
            }
          >
            <Text
              style={[
                styles.clear,
                directionalTextStyle(),
              ]}
            >
              {clearLabel ||
                t("common.clear")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* iOS picker */}
      {/* ----------------------------------------------------------------- */}

      {iosPickerMode &&
      Platform.OS === "ios" ? (
        <Animated.View
          style={[
            styles.iosPicker,
            {
              opacity: pickerAnim,
              transform: [
                {
                  translateY:
                    pickerAnim.interpolate({
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
            themeVariant={
              colors.background ===
              "#000000"
                ? "dark"
                : "light"
            }
            textColor={colors.text}
            accentColor={
              colors.primary
            }
            onChange={(_, picked) => {
              if (!picked) return;

              if (
                iosPickerMode === "date"
              ) {
                applyDate(picked);
              } else {
                applyTime(picked);
              }
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

// ============================================================================
// DATE / TIME HELPERS
// ============================================================================

export function getNextAlarmDateForTime(
  time: Date,
  customDate?: Date | null,
) {
  const now = new Date();
  const date = customDate || now;

  const candidate = mergeDateAndTime(
    date,
    time,
  );

  if (customDate) {
    return candidate;
  }

  if (
    candidate.getTime() >
    now.getTime()
  ) {
    return candidate;
  }

  return addDays(candidate, 1);
}

export function formatTimeValue(
  value: Date,
) {
  return formatDate(value, {
    hour: "numeric",
    minute: "2-digit",
  });
}