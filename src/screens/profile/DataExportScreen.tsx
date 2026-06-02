import React, { useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { getApiErrorMessage } from '@/utils/apiError';
import { useAuthStore } from '@/store/authStore';
import { showError, showConfirmDialog } from '@/components/ConfirmationDialog';

export const DataExportScreen: React.FC = () => {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const exportData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: unknown }>('/me/export');
      const json = JSON.stringify(res.data, null, 2);
      await Share.share({ message: json, title: 'Planora data export' });
    } catch (e) {
      showError('Export failed', getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = () => {
    showConfirmDialog({
      title: 'Delete account',
      message: 'This permanently deletes your account and data. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await apiClient.delete('/me');
          await logout();
        } catch (e) {
          showError('Error', getApiErrorMessage(e));
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.body}>Export a JSON copy of your tasks, goals, alarms, and profile.</Text>
      <Button label="Export my data" onPress={exportData} loading={loading} />
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Button label="Delete account" onPress={deleteAccount} variant="ghost" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  dangerZone: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  dangerTitle: { ...typography.label, color: colors.error, marginBottom: spacing.sm },
});
