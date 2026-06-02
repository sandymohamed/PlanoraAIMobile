import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { showAlert, showError, showSuccess } from '@/components/ConfirmationDialog';

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (newPassword.length < 8) {
      showAlert('Password too short', 'Use at least 8 characters.', { variant: 'warning' });
      return;
    }
    if (newPassword !== confirm) {
      showAlert('Mismatch', 'New passwords do not match.', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/me/change-password', { currentPassword, newPassword });
      showSuccess('Success', 'Password updated.', () => navigation.goBack());
    } catch (e) {
      showError('Error', getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {(['Current password', 'New password', 'Confirm password'] as const).map((label, i) => (
        <View key={label}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={[currentPassword, newPassword, confirm][i]}
            onChangeText={[setCurrentPassword, setNewPassword, setConfirm][i]}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ))}
      <Button label="Update password" onPress={submit} loading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
