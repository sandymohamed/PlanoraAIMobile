// components/routines/RoutineTimePicker.tsx

import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

import { PlanoraColors, radius, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { directionalTextStyle } from "@/utils/rtl";

interface RoutineTimePickerProps {
  value: string; // "08:40"
  onChange: (time: string) => void;
}

export const RoutineTimePicker: React.FC<RoutineTimePickerProps> = ({
  value,
  onChange,
}) => {
  const { t, i18n } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);

  const isArabic = i18n.language.startsWith("ar");
  const [showPicker, setShowPicker] = useState(false);
  const [pressed, setPressed] = useState(false);

  /**
   * Convert "08:40" -> Date
   * Only used internally by the native picker.
   */
  const getPickerDate = () => {
    const [hours, minutes] = value.split(":").map(Number);

    const date = new Date();

    date.setHours(
      Number.isFinite(hours) ? hours : 8,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0,
    );

    return date;
  };

  const handleChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    // Android sends dismissed event when Cancel is pressed
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }

    if (!selectedDate) {
      setShowPicker(false);
      return;
    }

    const hours = selectedDate.getHours().toString().padStart(2, "0");
    const minutes = selectedDate.getMinutes().toString().padStart(2, "0");

    onChange(`${hours}:${minutes}`);

    setShowPicker(false);
  };

  const displayTime = value || "08:00";

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          pressed && styles.containerPressed,
        ]}
        onPress={() => setShowPicker(true)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={
          isArabic
            ? `وقت العادة ${displayTime}`
            : `Routine time ${displayTime}`
        }
        accessibilityHint={
          isArabic
            ? "اضغط لفتح اختيار الوقت"
            : "Tap to open the time picker"
        }
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={23}
            color={colors.primary}
          />
        </View>

        <View
          style={[
            styles.content,
            {
              alignItems: isArabic ? "flex-end" : "flex-start",
            },
          ]}
        >
          <Text
            style={[styles.label, directionalTextStyle()]}
          >
            {t("common.time")}
          </Text>

          <Text
            style={[
              styles.value,
              directionalTextStyle(),
            ]}
          >
            {displayTime}
          </Text>
        </View>

        <MaterialCommunityIcons
          name={isArabic ? "chevron-left" : "chevron-right"}
          size={25}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={getPickerDate()}
          mode="time"
          display={Platform.OS === "android" ? "clock" : "spinner"}
          is24Hour={false}
          onChange={handleChange}
          themeVariant={
            colors.background === "#000000" ? "dark" : "light"
          }
          textColor={colors.text}
          accentColor={colors.primary}
        />
      )}
    </>
  );
};

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      minHeight: 68,
      width: "100%",
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

    containerPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },

    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },

    content: {
      flex: 1,
      minWidth: 0,
    },

    label: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: 3,
    },

    value: {
      ...typography.body,
      color: colors.text,
      fontWeight: "600",
    },
  });