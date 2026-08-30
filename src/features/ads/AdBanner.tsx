import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { config } from "@/config/env";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { PlanoraColors, spacing, typography } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";

const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
    slot: {
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      minHeight: 56,
    },
    adMobMountPoint: {
      minHeight: 56,
    },
  });

type AdPlacement = "home" | "tasks" | "calendar" | "goals" | string;

interface AdBannerProps {
  placement?: AdPlacement;
  style?: ViewStyle;
}

const HIDDEN_AD_CHANNELS = new Set([
  "development",
  "internal",
  "internal-testing",
  "closed",
  "closed-testing",
]);

function isProductionAdChannel() {
  return !HIDDEN_AD_CHANNELS.has(config.APP_RELEASE_CHANNEL.toLowerCase());
}

function canRenderProductionBanner(isPremium: boolean, adsRemoved: boolean) {
  if (!isProductionAdChannel()) return false;
  if (!config.ADS_ENABLED) return false;
  if (!isFeatureEnabled("ENABLE_ADS") || !isFeatureEnabled("ENABLE_BANNER_ADS"))
    return false;
  if (isPremium || adsRemoved) return false;
  return true;
}

export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  const { styles, colors } = usePlanoraStyles(createStyles);

  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const adsRemoved = useSubscriptionStore((s) => s.adsRemoved);
  const shouldRenderBanner = canRenderProductionBanner(isPremium, adsRemoved);

  return (
    <View
      style={[styles.slot, style]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      {shouldRenderBanner ? (
        <View style={styles.adMobMountPoint}>
          {/* TODO: Integrate AdMob banner here. This should be the only file that changes. */}
        </View>
      ) : null}
    </View>
  );
};
