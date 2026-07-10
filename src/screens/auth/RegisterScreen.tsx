import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { colors, spacing, typography } from '@/theme/tokens';
import { inputTextStyle } from '@/utils/rtl';
import { getApiErrorMessage, isEmailExistsError } from '@/utils/apiError';
import { showError, showConfirmDialog } from '@/components/ConfirmationDialog';
import { track, AnalyticsEvents } from '@/analytics/posthog';

const logoImage = require('@/assets/logo.jpg');

export const RegisterScreen: React.FC<{ navigation: { navigate: (screen: string) => void } }> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTaken, setEmailTaken] = useState(false);

  const handleRegister = async () => {
    setError('');
    setEmailTaken(false);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError(t('auth.enterName'));
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError(t('auth.enterValidEmail'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('auth.passwordMinError'));
      return;
    }

    setLoading(true);
    try {
      await register(trimmedEmail, password, trimmedName);
      track(AnalyticsEvents.SIGNUP_COMPLETED, { method: 'email' });
    } catch (e) {
      const msg = getApiErrorMessage(e);
      const taken = isEmailExistsError(e);
      setError(msg);
      setEmailTaken(taken);
      if (taken) {
        showConfirmDialog({
          title: t('auth.emailAlreadyRegistered'),
          message: msg,
          variant: 'warning',
          confirmLabel: t('auth.signIn'),
          cancelLabel: t('auth.useDifferentEmail'),
          onConfirm: () => navigation.navigate('Login'),
        });
      } else {
        showError(t('auth.couldNotCreateAccount'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandBlock}>
        <Image source={logoImage} style={styles.logo} />
        <Text style={styles.brand}>Planora</Text>
      </View>
      <Text style={styles.title}>{t('auth.startPlan')}</Text>
      <TextInput
        style={[styles.input, inputTextStyle()]}
        placeholder={t('auth.name')}
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, inputTextStyle()]}
        placeholder={t('auth.email')}
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PasswordInput
        placeholder={t('auth.passwordMin')}
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('auth.createAccount')} loading={loading} onPress={handleRegister} />
      {emailTaken ? (
        <Button label={t('auth.signInInstead')} variant="ghost" onPress={() => navigation.navigate('Login')} />
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  brandBlock: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 96, height: 96, borderRadius: 24, marginBottom: spacing.sm },
  brand: { ...typography.h1, color: colors.primary },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
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
});
