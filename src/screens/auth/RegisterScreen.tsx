import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage, isEmailExistsError } from '@/utils/apiError';
import { showError, showConfirmDialog } from '@/components/ConfirmationDialog';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { config } from '@/config/env';

export const RegisterScreen: React.FC<{ navigation: { navigate: (screen: string) => void } }> = ({
  navigation,
}) => {
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
      setError('Enter your name (at least 2 characters)');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    console.log('[Planora] Create account pressed', { api: config.API_BASE_URL, email: trimmedEmail });
    try {
      await register(trimmedEmail, password, trimmedName);
      track(AnalyticsEvents.SIGNUP_COMPLETED, { method: 'email' });
      console.log('[Planora] Create account success');
    } catch (e) {
      const msg = getApiErrorMessage(e);
      const taken = isEmailExistsError(e);
      console.warn('[Planora] Create account failed:', msg);
      setError(msg);
      setEmailTaken(taken);
      if (taken) {
        showConfirmDialog({
          title: 'Email already registered',
          message: msg,
          variant: 'warning',
          confirmLabel: 'Sign in',
          cancelLabel: 'Use different email',
          onConfirm: () => navigation.navigate('Login'),
        });
      } else {
        showError('Could not create account', msg);
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
      <Text style={styles.title}>Start your plan</Text>
      <Text style={styles.hint}>API: {config.API_BASE_URL}</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6)"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create account" loading={loading} onPress={handleRegister} />
      {emailTaken ? (
        <Button label="Sign in instead" variant="ghost" onPress={() => navigation.navigate('Login')} />
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
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.textMuted, marginBottom: spacing.lg, fontSize: 11 },
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
