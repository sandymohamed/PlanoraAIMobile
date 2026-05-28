import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { canShowRewardedAd } from './adHelpers';
import { isFeatureEnabled } from '@/config/featureFlags';
import { colors, spacing, typography, radius } from '@/theme/tokens';

interface RewardedAdButtonProps {
  label?: string;
  onReward?: () => void;
}

/**
 * Placeholder for rewarded ad — shows dialog until AdMob SDK is integrated.
 */
export const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({
  label = 'Watch ad for +1 AI credit',
  onReward,
}) => {
  if (!canShowRewardedAd()) {
    return null;
  }

  const handlePress = () => {
    Alert.alert(
      'Rewarded ad (coming soon)',
      'AdMob rewarded ads will grant bonus AI credits here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate reward',
          onPress: () => onReward?.(),
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.85}>
      <Icon name="play-circle-outline" size={20} color={colors.accent} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  text: { ...typography.caption, color: colors.accent, fontWeight: '600' },
});
