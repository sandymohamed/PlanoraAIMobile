import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { PlanoraColors, typography, radius } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

import type { PlanType } from "@/store/subscriptionStore";
import { useTranslation } from "react-i18next";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    premium: {
      backgroundColor: "rgba(94, 234, 212, 0.15)",
      borderColor: colors.accent,
    },
    small: { paddingHorizontal: 6, paddingVertical: 2 },
    text: {
      ...typography.label,
      color: colors.primary,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    textPremium: { color: colors.accent },
    textSmall: { fontSize: 8 },
    row: {
      alignItems: "center",
      gap: 6,
    },
  });

interface PremiumBadgeProps {
  variant?: "pro" | "premium";
  style?: ViewStyle;
  small?: boolean;
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  variant = "pro",
  style,
  small,
}) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const isPremium = variant === "premium";
  return (
    <View
      style={[
        styles.badge,
        isPremium && styles.premium,
        small && styles.small,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isPremium && styles.textPremium,
          small && styles.textSmall,
        ]}
      >
        {isPremium ? "PREMIUM" : "PRO"}
      </Text>
    </View>
  );
};

/** Show badge only when user is on free plan and feature is gated */
export function PremiumLabel({
  requiredPlan = "pro",
  children,
}: {
  requiredPlan?: PlanType;
  children: React.ReactNode;
}) {
  const { i18n } = useTranslation();
  const { styles, colors } = usePlanoraStyles(createStyles);

  return (
    <View
      style={[
        styles.row,
        { flexDirection: i18n.language === "ar" ? "row-reverse" : "row" },
      ]}
    >
      {children}
      <PremiumBadge
        variant={requiredPlan === "premium" ? "premium" : "pro"}
        small
      />
    </View>
  );
}
