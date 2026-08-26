import React, { useMemo } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useRTL } from "@/hooks/useRTL";
import { colors, spacing, typography } from "@/theme/tokens";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { AnalyticsEvents } from "@/analytics/posthog";
import { chevronForwardIcon } from "@/utils/rtl";

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  useScreenAnalytics(AnalyticsEvents.SETTINGS_OPENED);

  const {
    navigateNext,
    directionalTextStyle: dirText,
    rowDirection,
  } = useRTL();

  const items = useMemo(
    () => [
      {
        icon: "account-edit-outline",
        label: t("settings.editProfile"),
        route: "EditProfile",
      },
      {
        icon: "lock-outline",
        label: t("settings.changePassword"),
        route: "ChangePassword",
      },
      {
        icon: "delete-outline",
        label: t("settings.deleteAccount"),
        route: "DeleteAccount",
      },
      {
        icon: "bell-outline",
        label: t("settings.notifications"),
        route: "NotificationSettings",
      },
      {
        icon: "shield-account-outline",
        label: t("settings.privacy"),
        route: "PrivacySettings",
      },
      {
        icon: "translate",
        label: t("settings.language"),
        subtitle: t("settings.languageSubtitle"),
        route: "LanguageSettings",
      },
      {
        icon: "help-circle-outline",
        label: t("settings.helpSupport"),
        route: "HelpSupport",
      },
      {
        icon: "shield-star-outline",
        label: t("settings.privacyPolicy"),
        route: "PrivacyPolicy",
      },
      {
        icon: "information-outline",
        label: t("settings.termsOfService"),
        route: "TermsOfService",
      },
      {
        icon: "information-outline",
        label: t("settings.about"),
        route: "About",
      },
    ],
    [t],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      {items.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={[
            styles.row,
            { flexDirection: rowDirection() },
            // { flexDirection: isArabic ? 'row-reverse' : 'row' }
          ]}
          onPress={() => navigation.navigate(item.route)}
        >
          <Icon name={item.icon} size={22} color={colors.primary} />
          <View style={styles.labelWrap}>
            <Text style={[styles.label]}>{item.label}</Text>
            {item.subtitle ? (
              <Text style={[styles.subtitle]}>{item.subtitle}</Text>
            ) : null}
          </View>
          <Icon
            name={navigateNext()}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  labelWrap: { flex: 1 },
  label: { ...typography.body, color: colors.text },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
