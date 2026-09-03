import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import { useRTL } from "@/hooks/useRTL";
import { usePlanoraTheme } from "@/theme/ThemeProvider";
import {
  PlanoraColors,
  spacing,
  typography,
} from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { ThemeMode } from "@/theme/types";
import { markFirstLoginSetupAsSeen } from "@/services/firstLoginSetupStorage";
import { FirstLoginSetupParamList } from "@/navigation/FirstLoginSetupNavigator";
import { useAuthStore } from "@/store/authStore";

type Props = NativeStackScreenProps<
  FirstLoginSetupParamList,
  "FirstLoginTheme"
> & {
  onComplete: () => void;
};

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      flexGrow: 1,
      padding: spacing.lg,
      paddingTop: spacing.xxl,
    },

    header: {
      marginBottom: spacing.xl,
    },

    title: {
      ...typography.h1,
      color: colors.text,
      marginBottom: spacing.sm,
    },

    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
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

    footer: {
      marginTop: "auto",
      paddingTop: spacing.xl,
    },

    continueButton: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    continueText: {
      ...typography.body,
      color: "#FFFFFF",
      fontWeight: "700",
    },
  });

type FirstLoginThemeScreenProps = {
  onComplete: () => void;
};

export const FirstLoginThemeScreen: React.FC<
  FirstLoginThemeScreenProps
> = ({ onComplete }) => {
  const { t } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);
  const { directionalTextStyle: dirText } = useRTL();

  const {
    themeMode,
    setThemeMode,
  } = usePlanoraTheme();

  const options: Array<{
    mode: ThemeMode;
    icon: string;
    label: string;
    description: string;
  }> = [
    {
      mode: "dark",
      icon: "weather-night",
      label: t("theme.darkMode"),
      description: t("theme.darkModeEnabled"),
    },
    {
      mode: "light",
      icon: "white-balance-sunny",
      label: t("theme.lightMode"),
      description: t("theme.lightModeEnabled"),
    },
  ];

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

//   const handleContinue = async () => {
//     await markFirstLoginSetupAsSeen();

//     navigation.getParent()?.reset({
//       index: 0,
//       routes: [{ name: "Main" }],
//     });
//   };


const handleContinue = async () => {
  try {
    const userId = useAuthStore.getState().user?.id;

    if (!userId) {
      return;
    }

    await markFirstLoginSetupAsSeen(userId);

    onComplete();
  } catch (error) {
    console.error(
      "Failed to complete first login setup:",
      error,
    );
  }
};
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, dirText()]}>
          {t("theme.title")}
        </Text>

        <Text style={[styles.subtitle, dirText()]}>
          {t("theme.subtitle")}
        </Text>
      </View>

      <View style={styles.card}>
        {options.map((option, index) => {
          const selected =
            option.mode === themeMode;

          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.appearanceRow,
                index === options.length - 1 &&
                  styles.lastRow,
              ]}
              onPress={() =>
                handleThemeSelect(option.mode)
              }
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={styles.iconContainer}>
                <Icon
                  name={option.icon}
                  size={22}
                  color={
                    selected
                      ? colors.primary
                      : colors.textMuted
                  }
                />
              </View>

              <View style={styles.rowBody}>
                <Text
                  style={[
                    styles.rowLabel,
                    dirText(),
                  ]}
                >
                  {option.label}
                </Text>

                <Text
                  style={[
                    styles.rowDescription,
                    dirText(),
                  ]}
                >
                  {option.description}
                </Text>
              </View>

              <Icon
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

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>
            {t("common.continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};