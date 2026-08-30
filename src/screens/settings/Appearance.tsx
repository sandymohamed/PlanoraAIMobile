import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { useRTL } from "@/hooks/useRTL";
import { usePlanoraTheme } from "@/theme/ThemeProvider";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: spacing.lg,
    },

    title: {
      ...typography.h1,
      color: colors.text,
      marginBottom: spacing.sm,
    },

    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: "hidden",
    },

    appearanceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },

    lastRow: {
      borderBottomWidth: 0,
    },

    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },

    rowBody: {
      flex: 1,
    },

    rowLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: "700",
    },

    rowDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },

    radio: {
      marginStart: spacing.sm,
    },

    note: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
  });

export const Appearance: React.FC = () => {
  const { t } = useTranslation();

  const { styles, colors } = usePlanoraStyles(createStyles);

  const { directionalTextStyle: dirText } = useRTL();

  const { themeMode, setThemeMode } = usePlanoraTheme();

  const selectedTheme = themeMode === "dark" ? "dark" : "light";

  const options = [
    {
      mode: "dark" as const,
      icon: "weather-night",
      label: t("theme.darkMode"),
      description: t("theme.darkModeEnabled"),
    },
    {
      mode: "light" as const,
      icon: "white-balance-sunny",
      label: t("theme.lightMode"),
      description: t("theme.lightModeEnabled"),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, dirText()]}>
        {t("theme.title")}
      </Text>

      <Text style={[styles.subtitle, dirText()]}>
        {t("theme.subtitle")}
      </Text>

      <View style={styles.card}>
        {options.map((option, index) => {
          const selected = option.mode === selectedTheme;

          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.appearanceRow,
                index === options.length - 1 && styles.lastRow,
              ]}
              onPress={() => setThemeMode(option.mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={styles.iconContainer}>
                <Icon
                  name={option.icon}
                  size={22}
                  color={selected ? colors.primary : colors.textMuted}
                />
              </View>

              <View style={styles.rowBody}>
                <Text style={[styles.rowLabel, dirText()]}>
                  {option.label}
                </Text>

                <Text style={[styles.rowDescription, dirText()]}>
                  {option.description}
                </Text>
              </View>

              <Icon
                style={styles.radio}
                name={
                  selected
                    ? "radiobox-marked"
                    : "radiobox-blank"
                }
                size={24}
                color={
                  selected
                    ? colors.primary
                    : colors.textMuted
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.note, dirText()]}>
        {t("theme.note")}
      </Text>
    </ScrollView>
  );
};