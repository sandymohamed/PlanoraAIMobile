import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { AppIcon as Icon } from "@/components/ui/AppIcon";
import { Task, TaskStatus } from "@/types/task";
import { colors, spacing, typography } from "@/theme/tokens";
import { directionalHitSlop } from "@/utils/rtl";
import {
  formatDueLabel,
  isTaskOverdue,
  priorityColor,
  statusColor,
  translateTaskPriority,
  translateTaskStatus,
} from "@/utils/taskUi";
import { useTranslation } from "react-i18next";

const COMPLETE_ANIM_MS = 380;
const EXIT_ANIM_MS = 140;
const ROW_MARGIN = spacing.sm;
const HIT_SLOP = directionalHitSlop(8);

type Props = {
  task: Task;
  onPress?: () => void;
  onToggleComplete: () => Promise<void>;
  onDelete?: () => void;
  /** Minimal row for Home / embedded lists (no meta, no delete). */
  compact?: boolean;
  /** When false, row stays on screen as completed (e.g. Home today list). Default true. */
  dismissOnComplete?: boolean;
};

const TaskListRowComponent: React.FC<Props> = ({
  task,
  onPress,
  onToggleComplete,
  onDelete,
  compact = false,
  dismissOnComplete = true,
}) => {
  console.log("Rendering TaskListRow for task:", task);
  const isDone = task.status === TaskStatus.DONE;
  const overdue = isTaskOverdue(task);
  const dueLabel = formatDueLabel(task.dueDate, task.dueTime, { overdue });
  const { i18n } = useTranslation();

  const [phase, setPhase] = useState<
    "idle" | "completing" | "exiting" | "uncompleting"
  >("idle");
  const [busy, setBusy] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const greenOverlay = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(isDone ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isDone ? 1 : 0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const rowCollapse = useRef(new Animated.Value(1)).current;
  const [measuredHeight, setMeasuredHeight] = useState(72);

  useEffect(() => {
    if (isDone && phase === "idle") {
      checkScale.setValue(1);
      checkOpacity.setValue(1);
      greenOverlay.setValue(1);
      progress.setValue(1);
    } else if (!isDone && phase === "idle") {
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      greenOverlay.setValue(0);
      progress.setValue(0);
    }
  }, [isDone, phase, checkScale, checkOpacity, greenOverlay, progress]);

  const runCompleteAnimation = () =>
    new Promise<void>((resolve) => {
      progress.setValue(0);
      greenOverlay.setValue(0);
      checkScale.setValue(0);
      checkOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(greenOverlay, {
          toValue: 1,
          duration: COMPLETE_ANIM_MS * 0.55,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: COMPLETE_ANIM_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.spring(ringScale, {
            toValue: 1.15,
            friction: 5,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.spring(ringScale, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(120),
          Animated.parallel([
            Animated.spring(checkScale, {
              toValue: 1,
              friction: 5,
              tension: 180,
              useNativeDriver: true,
            }),
            Animated.timing(checkOpacity, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => resolve());
    });

  const runExitAnimation = () =>
    new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(rowOpacity, {
          toValue: 0,
          duration: EXIT_ANIM_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(rowCollapse, {
          toValue: 0,
          duration: EXIT_ANIM_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start(() => resolve());
    });

  const runUncompleteAnimation = () =>
    new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(greenOverlay, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 280,
          useNativeDriver: false,
        }),
        Animated.timing(checkOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(checkScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });

  const handleCheckPress = async () => {
    if (busy || phase !== "idle") return;
    setBusy(true);

    const resetVisuals = (completed?: boolean) => {
      const done = completed ?? task.status === TaskStatus.DONE;
      setPhase("idle");
      rowOpacity.setValue(1);
      rowCollapse.setValue(1);
      ringScale.setValue(1);
      if (done) {
        greenOverlay.setValue(1);
        progress.setValue(1);
        checkOpacity.setValue(1);
        checkScale.setValue(1);
      } else {
        greenOverlay.setValue(0);
        progress.setValue(0);
        checkOpacity.setValue(0);
        checkScale.setValue(0);
      }
    };

    try {
      if (isDone) {
        setPhase("uncompleting");
        await runUncompleteAnimation();
        await onToggleComplete();
        resetVisuals(false);
      } else {
        setPhase("completing");
        await runCompleteAnimation();
        if (dismissOnComplete) {
          setPhase("exiting");
          await Promise.all([runExitAnimation(), onToggleComplete()]);
          resetVisuals(true);
        } else {
          await onToggleComplete();
          resetVisuals(true);
        }
      }
    } catch {
      resetVisuals();
    } finally {
      setBusy(false);
    }
  };

  const showCompletedLook =
    phase === "completing" || phase === "exiting" || isDone;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const animatedRowStyle = compact
    ? { opacity: rowOpacity, overflow: "hidden" as const }
    : {
        opacity: rowOpacity,
        maxHeight: rowCollapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, measuredHeight],
        }),
        marginBottom: rowCollapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, ROW_MARGIN],
        }),
        overflow: "hidden" as const,
      };

  const animatedOverlayStyle = {
    opacity: greenOverlay.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

  const animatedCheckStyle = {
    opacity: checkOpacity,
    transform: [{ scale: checkScale }],
  };

  const animatedRingStyle = {
    transform: [{ scale: ringScale }],
  };

  return (
    <Animated.View style={animatedRowStyle}>
      <TouchableOpacity
        style={[
          styles.row,
          compact && styles.rowCompact,
          compact && showCompletedLook && styles.rowCompactDone,
          !compact && showCompletedLook && styles.rowComplete,
          !compact && overdue && !showCompletedLook && styles.rowOverdue,
          { flexDirection: i18n.language === "ar" ? "row-reverse" : "row" },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
        disabled={busy && phase === "exiting"}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && phase === "idle") setMeasuredHeight(h);
        }}
      >
        <Animated.View
          style={[styles.greenWash, animatedOverlayStyle]}
          pointerEvents="none"
        />

        <Animated.View
          style={[styles.progressTrack, { width: progressWidth }]}
          pointerEvents="none"
        />

        <TouchableOpacity
          style={[styles.check, compact && styles.checkCompact]}
          onPress={handleCheckPress}
          hitSlop={HIT_SLOP}
          disabled={busy}
        >
          <Animated.View style={animatedRingStyle}>
            <View
              style={[
                styles.checkIconStack,
                compact && styles.checkIconStackCompact,
                {
                  flexDirection: i18n.language === "ar" ? "row-reverse" : "row",
                },
              ]}
            >
              <Icon
                name="checkbox-blank-circle-outline"
                size={compact ? 22 : 26}
                color={showCompletedLook ? colors.success : colors.textMuted}
              />
              <Animated.View style={[styles.checkFilled, animatedCheckStyle]}>
                <Icon
                  name="checkbox-marked-circle"
                  size={compact ? 22 : 26}
                  color={colors.success}
                />
              </Animated.View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.rowBody}>
          <Text
            style={[
              styles.rowTitle,
              compact && styles.rowTitleCompact,
              showCompletedLook && styles.rowTitleDone,
              {
                textAlign: i18n.language === "ar" ? "right" : "left",
              },
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {task.title}
          </Text>
          {!compact && dueLabel ? (
            <Text
              style={[
                styles.due,
                overdue && !showCompletedLook && styles.dueOverdue,
                {
                  textAlign: i18n.language === "ar" ? "right" : "left",
                },
              ]}
            >
              {dueLabel}
            </Text>
          ) : null}
          {!compact ? (
            <View
              style={[
                styles.meta,

                {
                  flexDirection: i18n.language === "ar" ? "row-reverse" : "row",
                },
              ]}
            >
              <View
                style={[
                  styles.badge,
                  { borderColor: priorityColor(task.priority) },
                  {
                    flexDirection:
                      i18n.language === "ar" ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: priorityColor(task.priority) },
                  ]}
                >
                  {translateTaskPriority(task.priority)}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  {
                    color: showCompletedLook
                      ? colors.success
                      : statusColor(task.status),
                  },
                ]}
              >
                {showCompletedLook && phase !== "idle"
                  ? translateTaskStatus(TaskStatus.DONE)
                  : translateTaskStatus(task.status)}
              </Text>
            </View>
          ) : null}
        </View>

        {onDelete ? (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={HIT_SLOP}
            disabled={busy}
          >
            <Icon name="trash-can-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const TaskListRow = React.memo(
  TaskListRowComponent,
  (prev, next) =>
    prev.compact === next.compact &&
    prev.dismissOnComplete === next.dismissOnComplete &&
    Boolean(prev.onDelete) === Boolean(next.onDelete) &&
    prev.task.id === next.task.id &&
    prev.task.title === next.task.title &&
    prev.task.status === next.task.status &&
    prev.task.priority === next.task.priority &&
    prev.task.dueDate === next.task.dueDate &&
    prev.task.dueTime === next.task.dueTime,
);

const styles = StyleSheet.create({
  rowCompact: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 0,
  },
  rowCompactDone: {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderRadius: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  rowComplete: {
    borderColor: colors.success,
    backgroundColor: "rgba(74, 222, 128, 0.08)",
  },
  rowOverdue: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  },
  greenWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(74, 222, 128, 0.14)",
  },
  progressTrack: {
    position: "absolute",
    start: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.success,
    borderBottomStartRadius: 12,
  },
  check: { marginEnd: spacing.sm, marginTop: 2, zIndex: 1 },
  checkCompact: { marginTop: 0 },
  checkIconStack: { width: 26, height: 26 },
  checkIconStackCompact: { width: 22, height: 22, marginTop: 0 },
  rowTitleCompact: { fontWeight: "500" },
  checkFilled: {
    position: "absolute",
    start: 0,
    top: 0,
  },
  rowBody: { flex: 1, zIndex: 1 },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: "600", padding: 2 },
  rowTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  due: { ...typography.caption, color: colors.accent, marginTop: 4 },
  dueOverdue: { color: colors.error, fontWeight: "600" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  statusText: { ...typography.label, fontSize: 10 },
});
