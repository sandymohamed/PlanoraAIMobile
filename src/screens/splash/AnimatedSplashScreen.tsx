import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { colors, spacing, typography } from '@/theme/tokens';

const logoVideo = require('@/assets/logo.mp4');

type AnimatedSplashScreenProps = {
  onFinish: () => void;
};

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onFinish }) => (
  <View style={styles.container}>
    <Video
      source={logoVideo}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      paused={false}
      repeat={false}
      muted
      controls={false}
      onEnd={onFinish}
      onError={onFinish}
    />
    {/* <Pressable style={styles.skipButton} onPress={onFinish} accessibilityRole="button">
      <Text style={styles.skipText}>Skip</Text>
    </Pressable> */}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    end: spacing.lg,
    top: spacing.xxl,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 10, 15, 0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.label,
    color: colors.text,
  },
});
