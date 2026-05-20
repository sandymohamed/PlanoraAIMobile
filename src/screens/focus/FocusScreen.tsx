import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, spacing, typography } from '@/theme/tokens';
import { track, AnalyticsEvents } from '@/analytics/posthog';

type FocusMode = 'focus' | 'pomodoro' | 'deep';

const MODES: Record<FocusMode, { label: string; minutes: number }> = {
  focus: { label: 'Focus', minutes: 25 },
  pomodoro: { label: 'Pomodoro', minutes: 25 },
  deep: { label: 'Deep work', minutes: 90 },
};

export const FocusScreen: React.FC = () => {
  const [mode, setMode] = useState<FocusMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      interval.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running, secondsLeft]);

  useEffect(() => {
    const total = MODES[mode].minutes * 60;
    progress.value = withTiming(secondsLeft / total, { duration: 300 });
  }, [secondsLeft, mode]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + progress.value * 0.15 }],
    opacity: 0.4 + progress.value * 0.6,
  }));

  const start = () => {
    track(AnalyticsEvents.FOCUS_SESSION_STARTED, { mode });
    setRunning(true);
  };

  const stop = () => {
    track(AnalyticsEvents.FOCUS_SESSION_ENDED, { mode, secondsLeft });
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(MODES[mode].minutes * 60);
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Focus</Text>
      <View style={styles.modes}>
        {(Object.keys(MODES) as FocusMode[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.modeBtn, mode === k && styles.modeActive]}
            onPress={() => {
              setMode(k);
              reset();
              setSecondsLeft(MODES[k].minutes * 60);
            }}
          >
            <Text style={[styles.modeText, mode === k && styles.modeTextActive]}>{MODES[k].label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.timerWrap}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Text style={styles.timer}>
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.actions}>
        {!running ? (
          <TouchableOpacity style={styles.startBtn} onPress={start}>
            <Text style={styles.startText}>Start session</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stop}>
            <Text style={styles.startText}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={reset}>
          <Text style={styles.reset}>Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Distraction-free mode — native alarms from Manage Time App integrate here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center' },
  title: { ...typography.h1, color: colors.text, alignSelf: 'flex-start' },
  modes: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  modeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.surface },
  modeActive: { backgroundColor: colors.primarySoft },
  modeText: { color: colors.textMuted, fontWeight: '600' },
  modeTextActive: { color: colors.primary },
  timerWrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  timer: { fontSize: 56, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] },
  actions: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  startBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: 16 },
  stopBtn: { backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: 16 },
  startText: { ...typography.h3, color: '#fff' },
  reset: { color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
