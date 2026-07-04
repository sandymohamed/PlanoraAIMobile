import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const token = route.params?.token as string;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password }, { skipAuthHeader: true });
      navigation.navigate('Login');
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>New password</Text>
      <Text style={styles.sub}>Choose a strong password for your account.</Text>
      <PasswordInput
        placeholder="New password"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
      />
      <PasswordInput
        placeholder="Confirm password"
        placeholderTextColor={colors.textMuted}
        value={confirm}
        onChangeText={setConfirm}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Reset password" onPress={submit} loading={loading} />
      <Button label="Back to sign in" onPress={() => navigation.navigate('Login')} variant="ghost" />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  error: { color: colors.error, marginBottom: spacing.md },
});
