import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

const logoImage = require('@/assets/logo.jpg');

type LoadingOverlayProps = {
  visible?: boolean;
  label?: string;
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible = true, label = 'Loading...' }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return undefined;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [scale, visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
        <Image source={logoImage} style={styles.logo} />
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.82)',
    padding: spacing.lg,
  },
  logoWrap: {
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
