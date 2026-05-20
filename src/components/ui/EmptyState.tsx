import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
}) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction && (
      <View style={styles.action}>
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: spacing.xl },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  action: { marginTop: spacing.lg, width: '100%' },
});
