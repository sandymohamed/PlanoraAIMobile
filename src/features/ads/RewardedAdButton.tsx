import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { canShowRewardedAd } from "./adHelpers";
import { isFeatureEnabled } from "@/config/featureFlags";
import { showConfirmDialog } from "@/components/ConfirmationDialog";
import { PlanoraColors, spacing, typography, radius } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    btn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
    },
    text: { ...typography.caption, color: colors.accent, fontWeight: "600" },
  });

interface RewardedAdButtonProps {
  label?: string;
  onReward?: () => void;
}

/**
 * Placeholder for rewarded ad — shows dialog until AdMob SDK is integrated.
 */
export const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({
  label = "Watch ad for +1 AI credit",
  onReward,
}) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  if (!canShowRewardedAd()) {
    return null;
  }

  const handlePress = () => {
    showConfirmDialog({
      title: "Rewarded ad (coming soon)",
      message: "AdMob rewarded ads will grant bonus AI credits here.",
      confirmLabel: "Simulate reward",
      cancelLabel: "Cancel",
      onConfirm: () => onReward?.(),
    });
  };

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Icon name="play-circle-outline" size={20} color={colors.accent} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};
