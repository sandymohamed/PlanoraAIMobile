import React, { useState } from "react";
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
import { AppLanguage, setAppLanguage, supportedLanguages } from "@/i18n";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { FirstLoginSetupParamList } from "@/navigation/FirstLoginSetupNavigator";

type Props = NativeStackScreenProps<
  FirstLoginSetupParamList,
  "FirstLoginLanguage"
>;

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

    languageRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },

    lastRow: {
      borderBottomWidth: 0,
    },

    languageBody: {
      flex: 1,
    },

    languageLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: "700",
    },

    languageMeta: {
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

export const FirstLoginLanguageScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);
  const { directionalTextStyle: dirText } = useRTL();

  const currentLanguage = (
    i18n.language?.startsWith("ar") ? "ar" : "en"
  ) as AppLanguage;

  const [selectedLanguage, setSelectedLanguage] =
    useState<AppLanguage>(currentLanguage);

  const handleContinue = async () => {
    await setAppLanguage(selectedLanguage);

    navigation.replace("FirstLoginTheme");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, dirText()]}>{t("language.title")}</Text>

        <Text style={[styles.subtitle, dirText()]}>
          {t("language.subtitle")}
        </Text>
      </View>

      <View style={styles.card}>
        {supportedLanguages.map((language, index) => {
          const selected = language.code === selectedLanguage;

          return (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageRow,
                index === supportedLanguages.length - 1 && styles.lastRow,
              ]}
              onPress={() => setSelectedLanguage(language.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <View style={styles.languageBody}>
                <Text style={[styles.languageLabel, dirText()]}>
                  {language.nativeLabel}
                </Text>

                <Text style={[styles.languageMeta, dirText()]}>
                  {language.label}
                </Text>
              </View>

              <Icon
                name={selected ? "radiobox-marked" : "radiobox-blank"}
                size={24}
                color={selected ? colors.primary : colors.textMuted}
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
          <Text style={styles.continueText}>{t("common.continue")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
