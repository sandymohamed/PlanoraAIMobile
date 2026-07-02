import React, { useState } from 'react';
import { Image, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage, isInvalidCredentialsError } from '@/utils/apiError';

const logoImage = require('@/assets/logo.jpg');

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      if (isInvalidCredentialsError(e)) {
        console.warn('[Planora Auth] invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brandBlock}>
        <Image source={logoImage} style={styles.logo} />
        <Text style={styles.brand}>Planora</Text>
      </View>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Your goals deserve a real plan.</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Sign in" onPress={handleLogin} loading={loading} />
      <Button label="Forgot password?" onPress={() => navigation.navigate('ForgotPassword')} variant="ghost" />
      <Button label="Create account" onPress={() => navigation.navigate('Register')} variant="ghost" />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  brandBlock: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 96, height: 96, borderRadius: 24, marginBottom: spacing.sm },
  brand: { ...typography.h1, color: colors.primary },
  title: { ...typography.hero, color: colors.text },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
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
