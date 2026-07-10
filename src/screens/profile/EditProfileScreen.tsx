import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { inputTextStyle } from '@/utils/rtl';
import { getApiErrorMessage } from '@/utils/apiError';
import { showAlert, showError } from '@/components/ConfirmationDialog';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      showAlert('Name required', 'Please enter your name.', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.put<{ success: boolean; data: typeof user }>('/me', {
        name: name.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (res.data) updateUser(res.data);
      navigation.goBack();
    } catch (e) {
      showError('Error', getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={[styles.input, inputTextStyle()]} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />
      <Text style={styles.label}>Email</Text>
      <Text style={styles.readonly}>{user?.email}</Text>
      <Button label="Save" onPress={save} loading={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  readonly: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
});
