
import { PlanoraColors, spacing, typography, radius } from "@/theme/tokens";

import {StyleSheet} from "react-native";

export const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },

    // -----------------------------------------------------------------------
    // Header
    // -----------------------------------------------------------------------

    greeting: {
      ...typography.hero,
      color: colors.text,
    },

    sub: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },

    // -----------------------------------------------------------------------
    // Permissions
    // -----------------------------------------------------------------------

    permBanner: {
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      marginBottom: spacing.lg,
    },

    permBody: {
      flex: 1,
    },

    permText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: "600",
    },

    permSub: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // -----------------------------------------------------------------------
    // New user
    // -----------------------------------------------------------------------

    welcomeCard: {
      marginBottom: spacing.xl,
      overflow: "hidden",
      padding: 0,
    },

    welcomeGradient: {
      padding: spacing.lg,
      borderRadius: radius.lg,
    },

    welcomeIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },

    welcomeTitle: {
      ...typography.h1,
      color: "#fff",
      marginBottom: spacing.sm,
    },

    welcomeBody: {
      ...typography.body,
      color: "rgba(255,255,255,0.88)",
      lineHeight: 22,
      marginBottom: spacing.lg,
    },

    primaryButton: {
      minHeight: 50,
      borderRadius: radius.md,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      flexDirection: "row",
      gap: spacing.sm,
    },

    primaryButtonText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: "700",
    },

    exploreTitle: {
      ...typography.h2,
      color: colors.text,
      marginBottom: spacing.sm,
    },

    exploreSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },

    featureGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },

    featureCard: {
      width: "48%",
      minHeight: 125,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },

    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },

    featureTitle: {
      ...typography.body,
      color: colors.text,
      fontWeight: "700",
      marginBottom: 2,
    },

    featureBody: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 17,
    },

    // -----------------------------------------------------------------------
    // Existing user
    // -----------------------------------------------------------------------

    sectionLabel: {
      ...typography.label,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },

    // -----------------------------------------------------------------------
    // Active goal
    // -----------------------------------------------------------------------

    activeGoalCard: {
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },

    activeGoalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },

    activeGoalTitle: {
      ...typography.h2,
      color: colors.text,
      flex: 1,
    },

    goalArrow: {
      marginLeft: spacing.sm,
    },

    goalMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },

    progressWrap: {
      marginBottom: spacing.md,
    },

    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },

    progressLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    progressPct: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: "700",
    },

    progressTrack: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
    },

    // -----------------------------------------------------------------------
    // Current milestone
    // -----------------------------------------------------------------------

    milestoneCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
    },

    milestoneHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },

    milestoneLabel: {
      ...typography.label,
      color: colors.primary,
      marginLeft: spacing.xs,
      flex: 1,
    },

    milestoneTitle: {
      ...typography.body,
      color: colors.text,
      fontWeight: "700",
      marginBottom: 3,
    },

    milestoneDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 17,
    },

    milestoneDate: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },

    // -----------------------------------------------------------------------
    // No active goal
    // -----------------------------------------------------------------------

    noGoalCard: {
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },

    noGoalIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },

    noGoalTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.xs,
    },

    noGoalBody: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 21,
      marginBottom: spacing.md,
    },

    secondaryButton: {
      minHeight: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.xs,
    },

    secondaryButtonText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: "700",
    },

    // -----------------------------------------------------------------------
    // Focus
    // -----------------------------------------------------------------------

    focusCard: {
      marginBottom: spacing.lg,
    },

    focusTitle: {
      ...typography.h2,
      color: colors.text,
    },

    focusMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },

    // -----------------------------------------------------------------------
    // Quick actions
    // -----------------------------------------------------------------------

    quickRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },

    quickItem: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 92,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },

    quickIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },

    quickLabel: {
      ...typography.caption,
      color: colors.text,
      fontWeight: "600",
      textAlign: "center",
      fontSize: 11,
    },

    // -----------------------------------------------------------------------
    // Sections
    // -----------------------------------------------------------------------

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },

    sectionTitle: {
      ...typography.h3,
      color: colors.text,
    },

    sectionAction: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: "600",
    },

    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },

    taskTitle: {
      ...typography.body,
      color: colors.text,
      flex: 1,
    },

    emptyText: {
      ...typography.body,
      color: colors.textMuted,
      padding: spacing.sm,
    },

    loadingText: {
      ...typography.body,
      color: colors.textMuted,
      padding: spacing.sm,
    },

    // -----------------------------------------------------------------------
    // Streak
    // -----------------------------------------------------------------------

    streakCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.md,
    },

    streakNum: {
      ...typography.h3,
      color: colors.text,
    },

    streakMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    streakBadge: {
      ...typography.caption,
      color: colors.accent,
      fontWeight: "700",
    },
  });