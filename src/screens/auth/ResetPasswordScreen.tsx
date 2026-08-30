import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { getApiErrorMessage } from "@/utils/apiError";
import { track, trackFailure, AnalyticsEvents } from "@/analytics/posthog";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
      justifyContent: "center",
    },
    title: { ...typography.h1, color: colors.text },
    sub: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    error: { color: colors.error, marginBottom: spacing.md },
  });

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { styles, colors } = usePlanoraStyles(createStyles);

  const { t } = useTranslation();
  const token = route.params?.token as string;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (password.length < 6) {
      setError(t("auth.passwordMinError"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(
        "/auth/reset-password",
        { token, newPassword: password },
        { skipAuthHeader: true },
      );
      track(AnalyticsEvents.PASSWORD_RESET_COMPLETED);
      navigation.navigate("Login");
    } catch (e) {
      trackFailure(AnalyticsEvents.PASSWORD_RESET_FAILED, e, {
        step: "complete",
      });
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>{t("auth.newPassword")}</Text>
      <Text style={styles.sub}>{t("auth.newPasswordSubtitle")}</Text>
      <PasswordInput
        placeholder={t("auth.newPassword")}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
      />
      <PasswordInput
        placeholder={t("auth.confirmPassword")}
        placeholderTextColor={colors.textMuted}
        value={confirm}
        onChangeText={setConfirm}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={t("auth.resetPassword")}
        onPress={submit}
        loading={loading}
      />
      <Button
        label={t("auth.backToSignIn")}
        onPress={() => navigation.navigate("Login")}
        variant="ghost"
      />
    </KeyboardAvoidingView>
  );
};
