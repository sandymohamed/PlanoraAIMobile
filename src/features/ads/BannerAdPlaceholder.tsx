import React from 'react';
import { View, StyleSheet } from 'react-native';
import { shouldShowBannerAd } from './adHelpers';
import { AdPlaceholder } from './AdPlaceholder';
import { spacing } from '@/theme/tokens';

interface BannerAdPlaceholderProps {
  /** Screen identifier for future analytics */
  placement?: string;
}

/**
 * Standard banner slot — renders nothing for premium users or when ads disabled.
 */
export const BannerAdPlaceholder: React.FC<BannerAdPlaceholderProps> = () => {
  if (!shouldShowBannerAd()) {
    return null;
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Advertisement placeholder">
      <AdPlaceholder compact />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
