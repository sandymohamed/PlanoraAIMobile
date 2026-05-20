import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, shadows } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, elevated }) => (
  <View style={[styles.card, elevated && styles.elevated, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.card,
  },
});
