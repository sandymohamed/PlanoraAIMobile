import React, { useState } from "react";
import {
  Image,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  View,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { inputTextStyle } from "@/utils/rtl";
import { getApiErrorMessage } from "@/utils/apiError";
import { ActivityIndicator } from "react-native-paper";
import { GoogleIcon } from "./GoogleIcon";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const logoImage = require("@/assets/logo.jpg");

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
      justifyContent: "center",
    },
    brandBlock: { alignItems: "center", marginBottom: spacing.lg },
    logo: { width: 96, height: 96, borderRadius: 24, marginBottom: spacing.sm },
    brand: { ...typography.h1, color: colors.primary },
    title: { ...typography.hero, color: colors.text },
    sub: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      color: colors.text,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    error: { color: colors.error, marginBottom: spacing.md },
    googleButton: {
      marginTop: 6,
      width: "100%",
      height: 48,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: "#DADCE0",
      backgroundColor: "transparent",
    },

    googleButtonText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
  });

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);

  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");

    try {
      await loginWithGoogle();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandBlock}>
        <Image source={logoImage} style={styles.logo} />
        <Text style={styles.brand}>Planora</Text>
      </View>
      <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
      <Text style={styles.sub}>{t("auth.tagline")}</Text>
      <TextInput
        style={[styles.input, inputTextStyle()]}
        placeholder={t("auth.email")}
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PasswordInput
        placeholder={t("auth.password")}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={t("auth.signIn")}
        onPress={handleLogin}
        loading={loading}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityHint="Sign in using your Google account"
        onPress={handleGoogleLogin}
        disabled={googleLoading}
        style={styles.googleButton}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <GoogleIcon size={22} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>

      <Button
        label={t("auth.forgotPassword")}
        onPress={() => navigation.navigate("ForgotPassword")}
        variant="ghost"
      />
      <Button
        label={t("auth.createAccount")}
        onPress={() => navigation.navigate("Register")}
        variant="ghost"
      />
    </KeyboardAvoidingView>
  );
};
