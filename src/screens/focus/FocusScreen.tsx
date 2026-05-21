import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAlarmStore } from '@/store/alarmStore';
import { colors, spacing, typography } from '@/theme/tokens';
import { track, AnalyticsEvents } from '@/analytics/posthog';

type FocusMode = 'focus' | 'pomodoro' | 'deep';

const MODES: Record<FocusMode, { label: string; minutes: number }> = {
  focus: { label: 'Focus', minutes: 25 },
  pomodoro: { label: 'Pomodoro', minutes: 25 },
  deep: { label: 'Deep work', minutes: 90 },
};

export const FocusScreen: React.FC = () => {
  const { timers, activeTimer, fetchTimers, createTimer, startTimer, pauseTimer, stopTimer, deleteTimer } =
    useAlarmStore();
  const [mode, setMode] = useState<FocusMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [backendTimerId, setBackendTimerId] = useState<string | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(1);

  useEffect(() => {
    fetchTimers(1, 20);
  }, [fetchTimers]);

  useEffect(() => {
    if (activeTimer?.remainingTime != null) {
      setSecondsLeft(activeTimer.remainingTime);
      setRunning(activeTimer.isRunning);
      setBackendTimerId(activeTimer.id);
    }
  }, [activeTimer?.id, activeTimer?.remainingTime, activeTimer?.isRunning]);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      interval.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    } else if (secondsLeft === 0 && running) {
      setRunning(false);
      track(AnalyticsEvents.FOCUS_SESSION_ENDED, { mode, completed: true });
      Alert.alert('Session complete', 'Great focus block.');
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running, secondsLeft, mode]);

  useEffect(() => {
    const total = MODES[mode].minutes * 60;
    progress.value = withTiming(secondsLeft / total, { duration: 300 });
  }, [secondsLeft, mode, progress]);

  const ensureTimer = async () => {
    if (backendTimerId) return backendTimerId;
    const t = await createTimer({ title: `${MODES[mode].label} session`, duration: MODES[mode].minutes });
    setBackendTimerId(t.id);
    return t.id;
  };

  const start = async () => {
    try {
      const id = await ensureTimer();
      await startTimer(id);
      track(AnalyticsEvents.FOCUS_SESSION_STARTED, { mode });
      setRunning(true);
    } catch (e: any) {
      Alert.alert('Timer error', e.message);
    }
  };

  const pause = async () => {
    if (backendTimerId) await pauseTimer(backendTimerId);
    setRunning(false);
  };

  const reset = async () => {
    if (backendTimerId) {
      await stopTimer(backendTimerId).catch(() => {});
      await deleteTimer(backendTimerId).catch(() => {});
      setBackendTimerId(null);
    }
    setRunning(false);
    setSecondsLeft(MODES[mode].minutes * 60);
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + progress.value * 0.15 }],
    opacity: 0.4 + progress.value * 0.6,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Focus</Text>
      <Text style={styles.sub}>Synced with backend timers ({timers.length} saved)</Text>
      <View style={styles.modes}>
        {(Object.keys(MODES) as FocusMode[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.modeBtn, mode === k && styles.modeActive]}
            onPress={() => {
              setMode(k);
              void reset();
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
          <TouchableOpacity style={styles.stopBtn} onPress={pause}>
            <Text style={styles.startText}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={reset}>
          <Text style={styles.reset}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center' },
  title: { ...typography.h1, color: colors.text, alignSelf: 'flex-start' },
  sub: { ...typography.caption, color: colors.textMuted, alignSelf: 'flex-start', marginBottom: spacing.md },
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
});
