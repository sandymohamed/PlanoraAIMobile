import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, radius } from '@/theme/tokens';

interface AdPlaceholderProps {
  style?: ViewStyle;
  compact?: boolean;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ style, compact }) => (
  <LinearGradient
    colors={['rgba(124, 108, 246, 0.12)', 'rgba(94, 234, 212, 0.08)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.card, compact && styles.compact, style]}
  >
    <Text style={styles.sponsored}>Sponsored</Text>
    <Text style={styles.title}>Future Ad Placement</Text>
    {!compact ? (
      <Text style={styles.sub}>AdMob banner will appear here for free users</Text>
    ) : null}
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 72,
    justifyContent: 'center',
  },
  compact: { minHeight: 56, paddingVertical: spacing.sm },
  sponsored: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  sub: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontSize: 11 },
});
