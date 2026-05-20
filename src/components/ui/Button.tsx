import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}) => {
  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.primary, disabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.secondary, variant === 'ghost' && styles.ghost]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text style={[styles.secondaryText, variant === 'ghost' && styles.ghostText]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primary: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: { ...typography.h3, color: '#fff' },
  secondary: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { ...typography.body, color: colors.text, fontWeight: '600' },
  ghost: { backgroundColor: 'transparent', borderWidth: 0 },
  ghostText: { color: colors.primary },
  disabled: { opacity: 0.5 },
});
