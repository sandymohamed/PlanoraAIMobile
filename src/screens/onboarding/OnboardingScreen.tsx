import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Video from 'react-native-video';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { track, AnalyticsEvents } from '@/analytics/posthog';

const { width } = Dimensions.get('window');
const logoVideo = require('@/assets/logo.mp4');

const SLIDES = [
  {
    headline: 'Welcome to Planora',
    subtext: 'Planora AI transforms big ambitions into clear daily steps.',
    showLogoVideo: true,
  },
  {
    headline: 'Build routines that actually stick',
    subtext: 'Create habits, track consistency, and stay aligned every day.',
  },
  {
    headline: 'Never lose track of your time',
    subtext: 'Smart reminders, alarms, and focus timers keep you moving.',
  },
  {
    headline: 'Your AI productivity partner',
    subtext: 'Receive intelligent planning, weekly reviews, and momentum insights.',
  },
];

export const OnboardingScreen: React.FC = () => {
  const [index, setIndex] = useState(0);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = () => {
    track(AnalyticsEvents.ONBOARDING_COMPLETED);
    completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Planora AI</Text>
      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {item.showLogoVideo ? (
              <Video
                source={logoVideo}
                style={styles.logoVideo}
                resizeMode="cover"
                repeat
                muted
                paused={false}
                controls={false}
              />
            ) : null}
            <Text style={styles.headline}>{item.headline}</Text>
            <Text style={styles.subtext}>{item.subtext}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        {index < SLIDES.length - 1 ? (
          <Button label="Continue" onPress={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))} />
        ) : (
          <Button label="Get Started" onPress={finish} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
  brand: { ...typography.label, color: colors.primary, textAlign: 'center', marginBottom: spacing.xl },
  slide: { paddingHorizontal: spacing.xl, justifyContent: 'center', flex: 1 },
  logoVideo: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 32,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  headline: { ...typography.hero, color: colors.text, marginBottom: spacing.md },
  subtext: { ...typography.body, color: colors.textSecondary, lineHeight: 26 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
