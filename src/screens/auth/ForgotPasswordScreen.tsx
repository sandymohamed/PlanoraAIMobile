import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';

type Step = 'email' | 'otp';

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    setError('');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() }, { skipAuthHeader: true });
      setStep('otp');
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { token: string } }>(
        '/auth/verify-otp',
        { email: email.trim().toLowerCase(), otp: otp.trim() },
        { skipAuthHeader: true }
      );
      const token = res.data?.token;
      if (!token) throw new Error('Invalid response');
      navigation.navigate('ResetPassword', { token });
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{step === 'email' ? 'Reset password' : 'Enter code'}</Text>
      <Text style={styles.sub}>
        {step === 'email' ? 'We will email you a 6-digit verification code.' : `Code sent to ${email}`}
      </Text>

      {step === 'email' ? (
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label={step === 'email' ? 'Send code' : 'Verify code'}
        onPress={step === 'email' ? sendOtp : verifyOtp}
        loading={loading}
      />
      <Button label="Back to sign in" onPress={() => navigation.navigate('Login')} variant="ghost" />
      {step === 'otp' && <Button label="Resend code" onPress={sendOtp} variant="ghost" />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
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
