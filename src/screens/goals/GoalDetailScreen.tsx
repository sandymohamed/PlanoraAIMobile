import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { AppIcon as Icon } from "@/components/ui/AppIcon";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useGoalStore } from "@/store/goalStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { Milestone, MilestoneStatus } from "@/types/goal";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { directionalHitSlop } from "@/utils/rtl";
import { getApiErrorMessage } from "@/utils/apiError";
import { track, AnalyticsEvents } from "@/analytics/posthog";
import {
  showAlert,
  showError,
  showSuccess,
  showConfirmDialog,
} from "@/components/ConfirmationDialog";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { format } from "date-fns";
import { syncIfNeeded } from "@/services/sync/appSync";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: 48 },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    title: { ...typography.h1, color: colors.text },
    body: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    meta: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    progressTrack: {
      height: 8,
      backgroundColor: colors.borderSubtle,
      borderRadius: 4,
      marginTop: spacing.md,
      overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: colors.primary },
    progressLabel: {
      ...typography.caption,
      color: colors.primary,
      marginTop: spacing.xs,
    },
    actions: { flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
    actionBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    actionBtnText: {
      ...typography.caption,
      color: colors.text,
      fontWeight: "600",
    },
    aiBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: spacing.md,
      alignItems: "center",
    },
    aiBtnText: {
      ...typography.body,
      color: colors.background,
      fontWeight: "600",
    },
    sectionRow: {
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.xl,
    },
    section: { ...typography.h3, color: colors.text },
    link: { ...typography.caption, color: colors.primary, fontWeight: "600" },
    milestone: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    milestoneDone: {
      borderColor: colors.success,
      backgroundColor: "rgba(74, 222, 128, 0.08)",
    },
    mRow: { alignItems: "flex-start" },
    mCheck: { marginEnd: spacing.sm, marginTop: 2 },
    mCheckIconStack: { width: 26, height: 26 },
    mCheckFilled: { position: "absolute", start: 0, top: 0 },
    mBody: { flex: 1 },
    mTitleRow: {
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    mTitle: {
      ...typography.body,
      color: colors.text,
      fontWeight: "600",
      flex: 1,
    },
    mTitleDone: {
      textDecorationLine: "line-through",
      color: colors.textSecondary,
    },
    mStatus: { ...typography.caption, color: colors.textMuted },
    mDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    mMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
    mActions: { gap: spacing.md, marginTop: spacing.sm },
    danger: { marginTop: spacing.xl, alignItems: "center" },
    dangerText: { color: colors.error, ...typography.caption },
    error: { color: colors.error, padding: spacing.lg },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: spacing.lg,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: spacing.md,
      color: colors.text,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    multiline: { minHeight: 72 },
    modalActions: { justifyContent: "space-between", marginTop: spacing.md },
  });

export const GoalDetailScreen: React.FC = () => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const navigation = useNavigation<any>();
  const { goalId } =
    useRoute<RouteProp<{ params: { goalId: string } }, "params">>().params;
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const textDir = {
    textAlign: isArabic ? "right" : "left",
    writingDirection: isArabic ? "rtl" : "ltr",
  } as const;
  const rowDir = { flexDirection: isArabic ? "row-reverse" : "row" } as const;

  // Read from store - instant render from cache
  const currentGoal = useGoalStore((s) => s.currentGoal);
  const isLoading = useGoalStore((s) => s.isLoading);
  const isLoaded = useGoalStore((s) => s.isLoaded);

  // Store actions
  const fetchGoal = useGoalStore((s) => s.fetchGoal);
  const completeGoal = useGoalStore((s) => s.completeGoal);
  const pauseGoal = useGoalStore((s) => s.pauseGoal);
  const resumeGoal = useGoalStore((s) => s.resumeGoal);
  const cancelGoal = useGoalStore((s) => s.cancelGoal);
  const createMilestone = useGoalStore((s) => s.createMilestone);
  const updateMilestone = useGoalStore((s) => s.updateMilestone);
  const completeMilestone = useGoalStore((s) => s.completeMilestone);
  const deleteMilestone = useGoalStore((s) => s.deleteMilestone);
  const generateAIPlan = useGoalStore((s) => s.generateAIPlan);

  const [refreshing, setRefreshing] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<
    "create" | "edit" | null
  >(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDate, setMDate] = useState<Date | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isLoadingGoal, setIsLoadingGoal] = useState(false);

  const goal = currentGoal?.id === goalId ? currentGoal : null;

  const isGoalStopped = ["CANCELLED", "PAUSED", "DONE"].includes(
    goal?.status ?? "ACTIVE",
  );
  // ✅ Only fetch if goal doesn't exist in cache
  useEffect(() => {
    if (!goal && isLoaded) {
      setIsLoadingGoal(true);
      fetchGoal(goalId)
        .catch(() => {})
        .finally(() => {
          setIsLoadingGoal(false);
        });
    } else {
      // Silently check for updates in background
      const timer = setTimeout(() => {
        syncIfNeeded().catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [goal, goalId, fetchGoal, isLoaded]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoal(goalId);
    setRefreshing(false);
  };

  const openCreateMilestone = () => {
    setSelectedMilestone(null);
    setMTitle("");
    setMDesc("");
    setMDate(null);
    setMilestoneModal("create");
  };

  const openEditMilestone = (m: Milestone) => {
    setSelectedMilestone(m);
    setMTitle(m.title);
    setMDesc(m.description || "");
    setMDate(m.targetDate ? new Date(m.targetDate) : null);
    setMilestoneModal("edit");
  };

  const toggleMilestoneComplete = async (m: Milestone) => {
    try {
      if (m.status === MilestoneStatus.DONE) {
        await updateMilestone(goalId, m.id, {
          title: m.title,
          description: m.description,
          status: MilestoneStatus.TODO,
          targetDate: m.targetDate,
        });
      } else {
        await completeMilestone(goalId, m.id);
      }
    } catch (e) {
      showError(t("common.error"), getApiErrorMessage(e));
      throw e;
    }
  };

  const saveMilestone = async () => {
    if (!mTitle.trim()) {
      showAlert(
        t("goals.detail.milestoneTitleRequired"),
        t("goals.detail.milestoneTitleRequiredMessage"),
        { variant: "warning" },
      );
      return;
    }
    try {
      const payload = {
        title: mTitle.trim(),
        description: mDesc.trim() || undefined,
        targetDate: mDate ? mDate.toISOString() : undefined,
      };
      if (milestoneModal === "create") {
        await createMilestone(goalId, payload);
      } else if (selectedMilestone) {
        await updateMilestone(goalId, selectedMilestone.id, payload);
      }
      setMilestoneModal(null);
    } catch (e) {
      showError(t("common.error"), getApiErrorMessage(e));
    }
  };

  const onGenerateAI = async () => {
    setAiLoading(true);
    track(AnalyticsEvents.AI_GENERATE_CLICKED, { goalId });
    try {
      await generateAIPlan(goalId);
      const { fetchAIUsage } = useSubscriptionStore.getState();
      await fetchAIUsage();
      const { aiPlansRemaining, isPremium } = useSubscriptionStore.getState();
      const remainingNote =
        isPremium || aiPlansRemaining == null
          ? t("goals.detail.planGeneratedPremium")
          : t("goals.detail.planGeneratedRemaining", {
              count: aiPlansRemaining,
            });
      showSuccess(t("goals.detail.planGenerated"), remainingNote);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      if (status === 403) {
        showConfirmDialog({
          title: t("goals.detail.aiLimitTitle"),
          message: getApiErrorMessage(e),
          variant: "warning",
          confirmLabel: t("goals.detail.seePremium"),
          cancelLabel: t("goals.detail.notNow"),
          onConfirm: () => navigation.navigate("Paywall"),
        });
      } else {
        showError(t("common.error"), getApiErrorMessage(e));
      }
    } finally {
      setAiLoading(false);
    }
  };

  // ✅ Show loading only if goal doesn't exist and we're fetching it
  if ((!goal && isLoadingGoal) || (!goal && !isLoaded)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.container}>
        <Text style={[styles.error, textDir]}>
          {t("goals.screen.notFound")}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.title, textDir]}>{goal.title}</Text>
        {goal.description ? (
          <Text style={[styles.body, textDir]}>{goal.description}</Text>
        ) : null}
        <Text style={[styles.meta, textDir]}>
          {t(`goals.status.${goal.status}`)} ·{" "}
          {t(`goals.priority.${goal.priority}`)} ·{" "}
          {t(`goals.categories.${goal.category}`, {
            defaultValue: goal.category,
          })}
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, goal.progress || 0)}%` },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, textDir]}>
          {t("goals.screen.percentComplete", {
            percent: Math.round(goal.progress || 0),
          })}
        </Text>

        {goal.targetDate ? (
          <Text style={[styles.meta, textDir]}>
            {t("goals.screen.target", {
              date: format(new Date(goal.targetDate), "PPP"),
            })}
          </Text>
        ) : null}

        <View style={[styles.actions, rowDir]}>
          <ActionBtn
            label={t("goals.detail.edit")}
            textDir={textDir}
            onPress={() => navigation.navigate("GoalEdit", { goalId })}
          />
          <ActionBtn
            label={t("goals.detail.complete")}
            textDir={textDir}
            onPress={() =>
              completeGoal(goalId).catch((e) =>
                showError(t("common.error"), getApiErrorMessage(e)),
              )
            }
          />
          {isGoalStopped ? (
            <ActionBtn
              label={t("goals.detail.resume")}
              textDir={textDir}
              onPress={() =>
                resumeGoal(goalId).catch((e) =>
                  showError(t("common.error"), getApiErrorMessage(e)),
                )
              }
            />
          ) : (
            <ActionBtn
              label={t("goals.detail.pause")}
              textDir={textDir}
              onPress={() =>
                pauseGoal(goalId).catch((e) =>
                  showError(t("common.error"), getApiErrorMessage(e)),
                )
              }
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.aiBtn}
          onPress={onGenerateAI}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.aiBtnText, textDir]}>
              {t("goals.detail.generateAiPlan")}
            </Text>
          )}
        </TouchableOpacity>

        <View style={[styles.sectionRow, rowDir]}>
          <Text style={[styles.section, textDir]}>
            {t("goals.detail.milestones")}
          </Text>
          <TouchableOpacity onPress={openCreateMilestone}>
            <Text style={[styles.link, textDir]}>{t("goals.detail.add")}</Text>
          </TouchableOpacity>
        </View>

        {goal.milestones?.length ? (
          goal.milestones.map((m) => {
            const isDone = m.status === MilestoneStatus.DONE;
            return (
              <View
                key={m.id}
                style={[styles.milestone, isDone && styles.milestoneDone]}
              >
                <View style={[styles.mRow, rowDir]}>
                  <MilestoneCheckToggle
                    isDone={isDone}
                    onToggle={() => toggleMilestoneComplete(m)}
                  />
                  <View style={styles.mBody}>
                    <View style={[styles.mTitleRow, rowDir]}>
                      <Text
                        style={[
                          styles.mTitle,
                          textDir,
                          isDone && styles.mTitleDone,
                        ]}
                      >
                        {m.title}
                      </Text>
                      <Text
                        style={[
                          styles.mStatus,
                          textDir,
                          isDone && { color: colors.success },
                        ]}
                      >
                        {t(`goals.milestoneStatus.${m.status}`)}
                      </Text>
                    </View>
                    {m.description ? (
                      <Text style={[styles.mDesc, textDir]}>
                        {m.description}
                      </Text>
                    ) : null}
                    {m.targetDate ? (
                      <Text style={[styles.mMeta, textDir]}>
                        {format(new Date(m.targetDate), "MMM d, yyyy")}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.mActions, rowDir]}>
                  <TouchableOpacity onPress={() => openEditMilestone(m)}>
                    <Text style={[styles.link, textDir]}>
                      {t("goals.detail.editMilestone")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      showConfirmDialog({
                        title: t("goals.detail.deleteMilestoneTitle"),
                        itemName: m.title,
                        confirmLabel: t("goals.detail.deleteMilestone"),
                        destructive: true,
                        onConfirm: () => deleteMilestone(goalId, m.id),
                      })
                    }
                  >
                    <Text
                      style={[styles.link, textDir, { color: colors.error }]}
                    >
                      {t("goals.detail.deleteMilestone")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.body, textDir]}>
            {t("goals.detail.noMilestones")}
          </Text>
        )}

        {goal.status !== "CANCELLED" && (
          <TouchableOpacity
            style={styles.danger}
            onPress={() =>
              showConfirmDialog({
                title: t("goals.detail.cancelGoalTitle"),
                itemName: goal.title,
                confirmLabel: t("goals.detail.yes"),
                cancelLabel: t("goals.detail.no"),
                destructive: true,
                onConfirm: () =>
                  cancelGoal(goalId).then(() => navigation.goBack()),
              })
            }
          >
            <Text style={[styles.dangerText, textDir]}>
              {" "}
              {t("goals.detail.cancelGoal")}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={milestoneModal !== null}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={[styles.modalTitle, textDir]}>
              {milestoneModal === "create"
                ? t("goals.detail.newMilestone")
                : t("goals.detail.editMilestoneTitle")}
            </Text>
            <TextInput
              style={[styles.input, textDir]}
              placeholder={t("goals.detail.milestoneTitle")}
              placeholderTextColor={colors.textMuted}
              value={mTitle}
              onChangeText={setMTitle}
            />
            <TextInput
              style={[styles.input, styles.multiline, textDir]}
              placeholder={t("goals.detail.milestoneDescription")}
              placeholderTextColor={colors.textMuted}
              value={mDesc}
              onChangeText={setMDesc}
              multiline
            />
            <DateTimePicker
              mode="date"
              value={mDate}
              onChange={setMDate}
              placeholder={t("goals.detail.noMilestoneDate")}
              clearLabel={t("goals.detail.noDate")}
              helperText={t("goals.detail.milestoneDateHelper")}
              showClear={Boolean(mDate)}
            />
            <View style={[styles.modalActions, rowDir]}>
              <TouchableOpacity onPress={() => setMilestoneModal(null)}>
                <Text style={[styles.link, textDir]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveMilestone}>
                <Text style={[styles.link, textDir, { fontWeight: "700" }]}>
                  {t("goals.detail.save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const ActionBtn: React.FC<{
  label: string;
  textDir: { textAlign: "right" | "left"; writingDirection: "rtl" | "ltr" };
  onPress: () => void;
}> = ({ label, textDir, onPress }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={[styles.actionBtnText, textDir]}>{label}</Text>
    </TouchableOpacity>
  );
};

const MilestoneCheckToggle: React.FC<{
  isDone: boolean;
  onToggle: () => Promise<void>;
}> = ({ isDone, onToggle }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const [phase, setPhase] = useState<"idle" | "completing" | "uncompleting">(
    "idle",
  );
  const [busy, setBusy] = useState(false);

  const checkScale = useRef(new Animated.Value(isDone ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isDone ? 1 : 0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDone && phase === "idle") {
      checkScale.setValue(1);
      checkOpacity.setValue(1);
    } else if (!isDone && phase === "idle") {
      checkScale.setValue(0);
      checkOpacity.setValue(0);
    }
  }, [isDone, phase, checkScale, checkOpacity]);

  const runCompleteAnimation = () =>
    new Promise<void>((resolve) => {
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      Animated.parallel([
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

  const runUncompleteAnimation = () =>
    new Promise<void>((resolve) => {
      Animated.parallel([
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

  const handlePress = async () => {
    if (busy || phase !== "idle") return;
    setBusy(true);

    const resetVisuals = (done?: boolean) => {
      const completed = done ?? isDone;
      setPhase("idle");
      ringScale.setValue(1);
      if (completed) {
        checkOpacity.setValue(1);
        checkScale.setValue(1);
      } else {
        checkOpacity.setValue(0);
        checkScale.setValue(0);
      }
    };

    try {
      if (isDone) {
        setPhase("uncompleting");
        await runUncompleteAnimation();
        await onToggle();
        resetVisuals(false);
      } else {
        setPhase("completing");
        await runCompleteAnimation();
        await onToggle();
        resetVisuals(true);
      }
    } catch {
      resetVisuals();
    } finally {
      setBusy(false);
    }
  };

  const showCompletedLook = phase === "completing" || isDone;

  return (
    <TouchableOpacity
      style={styles.mCheck}
      onPress={handlePress}
      hitSlop={directionalHitSlop(8)}
      disabled={busy}
    >
      <Animated.View style={{ transform: [{ scale: ringScale }] }}>
        <View style={styles.mCheckIconStack}>
          <Icon
            name="checkbox-blank-circle-outline"
            size={26}
            color={showCompletedLook ? colors.success : colors.textMuted}
          />
          <Animated.View
            style={[
              styles.mCheckFilled,
              { opacity: checkOpacity, transform: [{ scale: checkScale }] },
            ]}
          >
            <Icon
              name="checkbox-marked-circle"
              size={26}
              color={colors.success}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};
