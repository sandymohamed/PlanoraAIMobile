import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AppIcon as Icon } from '@/components/ui/AppIcon';
import { showAlert } from '@/components/ConfirmationDialog';
import { colors, spacing, typography } from '@/theme/tokens';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import {
  FOCUS_MODES,
  FocusMode,
  FocusStats,
  loadSession,
  saveSession,
  clearSession,
  loadStats,
  recordCompletedSession,
  scheduleFocusAlarm,
  cancelFocusAlarm,
  stopFocusAlarmSound,
  computeRemaining,
} from '@/services/focusSessionService';

type Status = 'idle' | 'running' | 'paused';

const RING_SIZE = 260;
const RING_STROKE = 12;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_MINUTES = 5;
const MAX_MINUTES = 180;

export const FocusScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MODES.pomodoro.minutes * 60);
  const [status, setStatus] = useState<Status>('idle');
  const [stats, setStats] = useState<FocusStats>({ date: '', completed: 0, focusedSeconds: 0 });
  const [completedMode, setCompletedMode] = useState<FocusMode | null>(null);

  const totalSecRef = useRef(FOCUS_MODES.pomodoro.minutes * 60);
  const endsAtRef = useRef<number | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopInterval = useCallback(() => {
    if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }
  }, []);

  const handleComplete = useCallback(async () => {
    stopInterval();
    endsAtRef.current = null;
    setStatus('idle');
    setSecondsLeft(FOCUS_MODES[mode].minutes * 60);
    totalSecRef.current = FOCUS_MODES[mode].minutes * 60;
    await clearSession().catch(() => {});
    const updated = await recordCompletedSession(totalSecRef.current).catch(() => null);
    if (updated) setStats(updated);
    track(AnalyticsEvents.FOCUS_SESSION_ENDED, { mode, completed: true });
    setCompletedMode(mode);
  }, [mode, stopInterval]);

  const dismissComplete = useCallback(async () => {
    setCompletedMode(null);
    await stopFocusAlarmSound().catch(() => {});
  }, []);

  const tick = useCallback(() => {
    if (endsAtRef.current == null) return;
    const remaining = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining <= 0) {
      handleComplete();
    }
  }, [handleComplete]);

  const startInterval = useCallback(() => {
    stopInterval();
    interval.current = setInterval(tick, 1000);
  }, [stopInterval, tick]);

  // Restore the last session whenever the screen is focused.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [session, todayStats] = await Promise.all([loadSession(), loadStats()]);
        if (cancelled) return;
        setStats(todayStats);

        if (!session) {
          // No previous session → reset to default.
          resetToMode(mode, false);
          return;
        }

        const remaining = computeRemaining(session);
        setMode(session.mode);
        totalSecRef.current = session.durationSec;

        if (session.status === 'running') {
          if (remaining <= 0) {
            // Completed while away → auto-reset.
            await clearSession().catch(() => {});
            resetToMode(session.mode, false);
          } else {
            endsAtRef.current = session.endsAt;
            setSecondsLeft(remaining);
            setStatus('running');
            startInterval();
          }
        } else {
          // Paused
          endsAtRef.current = null;
          setSecondsLeft(remaining);
          setStatus('paused');
        }
      })();

      return () => {
        cancelled = true;
        stopInterval();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Re-sync countdown when returning from background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && status === 'running' && endsAtRef.current != null) {
        tick();
      }
    });
    return () => sub.remove();
  }, [status, tick]);

  useEffect(() => () => stopInterval(), [stopInterval]);

  const resetToMode = (m: FocusMode, persistClear = true) => {
    stopInterval();
    endsAtRef.current = null;
    const total = FOCUS_MODES[m].minutes * 60;
    totalSecRef.current = total;
    setSecondsLeft(total);
    setStatus('idle');
    if (persistClear) clearSession().catch(() => {});
  };

  const beginCountdown = async (fromSeconds: number) => {
    const endsAt = Date.now() + fromSeconds * 1000;
    endsAtRef.current = endsAt;
    if (status === 'idle') totalSecRef.current = fromSeconds;
    setStatus('running');
    startInterval();
    try {
      await scheduleFocusAlarm(endsAt, t(`focusScreen.modes.${mode}.label`));
    } catch {
      // Permission denied or native error — countdown still runs in-app.
      showAlert(
        t('focusScreen.backgroundAlarmTitle'),
        t('focusScreen.backgroundAlarmMessage'),
        { variant: 'warning' }
      );
    }
    await saveSession({
      mode,
      durationSec: totalSecRef.current,
      status: 'running',
      endsAt,
      remainingSec: fromSeconds,
      startedAt: Date.now(),
    }).catch(() => {});
  };

  const onStart = async () => {
    track(AnalyticsEvents.FOCUS_SESSION_STARTED, { mode, durationSec: secondsLeft });
    await beginCountdown(secondsLeft);
  };

  const onPause = async () => {
    stopInterval();
    const remaining = endsAtRef.current
      ? Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000))
      : secondsLeft;
    endsAtRef.current = null;
    setSecondsLeft(remaining);
    setStatus('paused');
    await cancelFocusAlarm().catch(() => {});
    await saveSession({
      mode,
      durationSec: totalSecRef.current,
      status: 'paused',
      endsAt: null,
      remainingSec: remaining,
      startedAt: Date.now(),
    }).catch(() => {});
  };

  const onResume = () => beginCountdown(secondsLeft);

  const onReset = async () => {
    await clearSession().catch(() => {});
    resetToMode(mode, false);
  };

  const onSelectMode = (m: FocusMode) => {
    if (m === mode) return;
    setMode(m);
    resetToMode(m, true);
  };

  const adjustMinutes = (deltaMin: number) => {
    if (status !== 'idle') return;
    const nextMin = Math.min(
      MAX_MINUTES,
      Math.max(MIN_MINUTES, Math.round(secondsLeft / 60) + deltaMin)
    );
    const total = nextMin * 60;
    totalSecRef.current = total;
    setSecondsLeft(total);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const ratio = totalSecRef.current > 0 ? secondsLeft / totalSecRef.current : 1;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr', alignSelf: isArabic ? 'flex-end' : 'flex-start' }]}>
        {t('focusScreen.title')}
      </Text>
      <Text style={[styles.sub, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr', alignSelf: isArabic ? 'flex-end' : 'flex-start' }]}>
        {t('focusScreen.subtitle')}
      </Text>

      <View style={[styles.statsRow, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {t('focusScreen.sessionsToday')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{Math.round(stats.focusedSeconds / 60)}{t('focusScreen.min')}</Text>
          <Text style={[styles.statLabel, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {t('focusScreen.focusedToday')}
          </Text>
        </View>
      </View>

      <View style={[styles.modes, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
        {(Object.keys(FOCUS_MODES) as FocusMode[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.modeBtn, mode === k && styles.modeActive]}
            onPress={() => onSelectMode(k)}
          >
            <Text style={[styles.modeText, mode === k && styles.modeTextActive]}>
              {t(`focusScreen.modes.${k}.label`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.timerWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.borderSubtle}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={status === 'paused' ? colors.textMuted : colors.primary}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            rotation={-90}
            originX={RING_SIZE / 2}
            originY={RING_SIZE / 2}
          />
        </Svg>
        <View style={styles.timerCenter} pointerEvents="box-none">
          <Text style={styles.timer}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text style={[styles.timerHint, { textAlign: 'center', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
            {status === 'running'
              ? t('focusScreen.inFocus')
              : status === 'paused'
                ? t('focusScreen.paused')
                : t(`focusScreen.modes.${mode}.tagline`)}
          </Text>
          {status === 'idle' && (
            <View style={[styles.stepper, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustMinutes(-5)}>
                <Icon name="minus" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepLabel}>{Math.round(secondsLeft / 60)} {t('focusScreen.min')}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustMinutes(5)}>
                <Icon name="plus" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        {status === 'running' ? (
          <TouchableOpacity style={[styles.secondaryBtn, { flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={onPause}>
            <Icon name="pause" size={20} color={colors.text} />
            <Text style={styles.secondaryText}>{t('focusScreen.pause')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.startBtn, { flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={status === 'paused' ? onResume : onStart}>
            <Icon name="play" size={22} color="#fff" />
            <Text style={styles.startText}>{status === 'paused' ? t('focusScreen.resume') : t('focusScreen.startSession')}</Text>
          </TouchableOpacity>
        )}
        {status !== 'idle' && (
          <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
            <Text style={[styles.reset, { textAlign: 'center', writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{t('focusScreen.reset')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={completedMode !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissComplete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Icon name="check-circle" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>{t('focusScreen.sessionComplete')}</Text>
            <Text style={[styles.modalMessage, { writingDirection: isArabic ? 'rtl' : 'ltr' }]}>
              {t('focusScreen.sessionCompleteMessage', {
                mode: completedMode ? t(`focusScreen.modes.${completedMode}.label`) : t('focusScreen.title'),
              })}
            </Text>
            <TouchableOpacity style={[styles.modalButton, { flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={dismissComplete} activeOpacity={0.85}>
              <Icon name="stop-circle-outline" size={20} color="#fff" />
              <Text style={styles.modalButtonText}>{t('focusScreen.stopAlarm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, alignItems: 'center' },
  title: { ...typography.h1, color: colors.text, alignSelf: 'flex-start' },
  sub: { ...typography.caption, color: colors.textMuted, alignSelf: 'flex-start', marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch', marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: { ...typography.h3, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  modes: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  modeBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.surface },
  modeActive: { backgroundColor: colors.primarySoft },
  modeText: { color: colors.textMuted, fontWeight: '600' },
  modeTextActive: { color: colors.primary },
  timerWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg },
  timerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timer: { fontSize: 60, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] },
  timerHint: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepLabel: { ...typography.body, color: colors.text, minWidth: 64, textAlign: 'center' },
  actions: { marginTop: spacing.lg, alignItems: 'center', gap: spacing.md },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 16,
  },
  secondaryText: { ...typography.h3, color: colors.text },
  startText: { ...typography.h3, color: '#fff' },
  resetBtn: { paddingVertical: spacing.sm },
  reset: { color: colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  modalMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
  },
  modalButtonText: { ...typography.h3, color: '#fff' },
});
