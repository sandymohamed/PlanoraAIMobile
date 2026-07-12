import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, spacing, typography, radius } from "@/theme/tokens";
import {
  trackPremiumClick,
  useSubscriptionStore,
} from "@/store/subscriptionStore";
import { useScreenAnalytics } from "@/hooks/useScreenAnalytics";
import { AnalyticsEvents } from "@/analytics/posthog";

const FREE_FEATURES = [
  "Up to 3 active goals",
  "5 AI plans every month",
  "Goals, tasks & milestones",
  "Daily routines & reminders",
  "Calendar & productivity tools",
];

const PRO_FEATURES = [
  "More AI planning",
  "More active goals",
  "Advanced routines",
  "Smart productivity insights",
  "Early access to new features",
];

const PREMIUM_FEATURES = [
  "Unlimited AI planning",
  "Advanced productivity analytics",
  "AI productivity coach",
  "Priority support",
  "Exclusive premium features",
];

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const aiPlansRemaining = useSubscriptionStore((s) => s.aiPlansRemaining);
  const aiPlansLimit = useSubscriptionStore((s) => s.aiPlansLimit);
  const fetchAIUsage = useSubscriptionStore((s) => s.fetchAIUsage);

  useScreenAnalytics(AnalyticsEvents.PREMIUM_PAGE_OPENED, {
    source: "subscription",
  });

  useEffect(() => {
    fetchAIUsage();
  }, [fetchAIUsage]);

  const usageLabel = isPremium
    ? "Unlimited AI plans"
    : aiPlansLimit != null
      ? `${aiPlansRemaining ?? 0} of ${aiPlansLimit} AI plans remaining this month`
      : `${aiPlansRemaining ?? 0} AI plans remaining this month`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Planora Premium</Text>
        <Text style={styles.heroSub}>Unlock your full planning potential</Text>
      </LinearGradient>

      <View style={styles.usagePill}>
        <Text style={styles.usageText}>{usageLabel}</Text>
      </View>

      <Card style={styles.plan}>
        <Text style={styles.planName}>Free</Text>

        <Text style={styles.subtitle}>Available today</Text>

        {FREE_FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
      </Card>

      <Card style={styles.plan}>
        <Text style={[styles.badge]}>Coming Soon</Text>

        <Text style={styles.planName}>Pro</Text>

        <Text style={styles.subtitle}>Built for productivity enthusiasts.</Text>

        {PRO_FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
      </Card>

      <Card elevated style={styles.premiumPlan}>
        <Text style={styles.futureBadge}>Future Vision</Text>

        <Text style={[styles.planName, { color: colors.primary }]}>
          Premium
        </Text>

        <Text style={styles.subtitle}>The complete Planora experience.</Text>

        {PREMIUM_FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}

        <Button
          label="Join the waitlist"
          onPress={() => {
            trackPremiumClick("subscription_screen");
            navigation.navigate("Paywall");
          }}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  usagePill: {
    alignSelf: "center",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  usageText: { ...typography.caption, color: colors.accent, fontWeight: "600" },
  heroTitle: { ...typography.h1, color: "#fff" },
  heroSub: { ...typography.body, color: "rgba(255,255,255,0.9)", marginTop: 4 },
  plan: { marginBottom: spacing.md },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },

  futureBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
    fontWeight: "700",
  },
  premiumPlan: { borderColor: colors.primary, borderWidth: 1 },
  planName: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  price: { ...typography.h3, color: colors.accent, marginBottom: spacing.md },
  feature: { ...typography.body, color: colors.textSecondary, marginBottom: 6 },
});
