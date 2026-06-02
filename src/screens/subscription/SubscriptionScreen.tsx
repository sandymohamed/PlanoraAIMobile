import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { trackPremiumClick, useSubscriptionStore } from '@/store/subscriptionStore';

const FREE_FEATURES = ['Up to 3 active goals', '3 AI plans / month', 'Basic routines', 'Basic reminders'];
const PREMIUM_FEATURES = [
  'Unlimited goals',
  'Unlimited AI planning',
  'Advanced routines',
  'Smart AI weekly reviews',
  'Cloud backup',
  'Focus analytics',
  'Premium themes',
];

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const aiPlansRemaining = useSubscriptionStore((s) => s.aiPlansRemaining);
  const aiPlansLimit = useSubscriptionStore((s) => s.aiPlansLimit);
  const fetchAIUsage = useSubscriptionStore((s) => s.fetchAIUsage);

  useEffect(() => {
    fetchAIUsage();
  }, [fetchAIUsage]);

  const usageLabel = isPremium
    ? 'Unlimited AI plans'
    : aiPlansLimit != null
    ? `${aiPlansRemaining ?? 0} of ${aiPlansLimit} AI plans remaining this month`
    : `${aiPlansRemaining ?? 0} AI plans remaining this month`;

  return (
  <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.hero}>
      <Text style={styles.heroTitle}>Planora Premium</Text>
      <Text style={styles.heroSub}>Unlock your full planning potential</Text>
    </LinearGradient>

    <View style={styles.usagePill}>
      <Text style={styles.usageText}>{usageLabel}</Text>
    </View>

    <Card style={styles.plan}>
      <Text style={styles.planName}>Free</Text>
      {FREE_FEATURES.map((f) => (
        <Text key={f} style={styles.feature}>• {f}</Text>
      ))}
    </Card>

    <Card elevated style={styles.premiumPlan}>
      <Text style={[styles.planName, { color: colors.primary }]}>Premium</Text>
      <Text style={styles.price}>$9.99 / month</Text>
      {PREMIUM_FEATURES.map((f) => (
        <Text key={f} style={styles.feature}>✓ {f}</Text>
      ))}
      <Button
        label="Join the waitlist"
        onPress={() => {
          trackPremiumClick('subscription_screen');
          navigation.navigate('Paywall');
        }}
      />
      <TouchableOpacity onPress={() => navigation.navigate('Paywall')} style={{ marginTop: spacing.md }}>
        <Text style={{ color: colors.primary, textAlign: 'center', fontWeight: '600' }}>Premium coming soon →</Text>
      </TouchableOpacity>
    </Card>
  </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { padding: spacing.xl, borderRadius: radius.lg, marginBottom: spacing.lg },
  usagePill: {
    alignSelf: 'center',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  usageText: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  heroTitle: { ...typography.h1, color: '#fff' },
  heroSub: { ...typography.body, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  plan: { marginBottom: spacing.md },
  premiumPlan: { borderColor: colors.primary, borderWidth: 1 },
  planName: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  price: { ...typography.h3, color: colors.accent, marginBottom: spacing.md },
  feature: { ...typography.body, color: colors.textSecondary, marginBottom: 6 },
});
