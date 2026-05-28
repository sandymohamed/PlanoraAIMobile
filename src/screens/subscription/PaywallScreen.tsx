import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { trackPremiumClick } from '@/store/subscriptionStore';

const PRO_FEATURES = ['No ads', '15 AI plans / day', 'Routine insights', 'Advanced analytics'];
const PREMIUM_FEATURES = [
  'Everything in Pro',
  'Unlimited AI planning',
  'Smart weekly reviews',
  'Future team collaboration',
  'Priority support',
];

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const planType = useSubscriptionStore((s) => s.planType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()}>
        <Icon name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.hero}>
        <Text style={styles.heroTitle}>Unlock Planora</Text>
        <Text style={styles.heroSub}>Plan smarter. No distractions.</Text>
      </LinearGradient>

      <Card style={styles.planCard}>
        <Text style={styles.planName}>Free</Text>
        <Text style={styles.planPrice}>$0</Text>
        <Text style={styles.feature}>• Ads supported</Text>
        <Text style={styles.feature}>• 3 AI plans / day</Text>
        <Text style={styles.feature}>• Basic analytics</Text>
        {planType === 'free' ? <Text style={styles.current}>Current plan</Text> : null}
      </Card>

      <Card elevated style={styles.planCard}>
        <View style={styles.planRow}>
          <Text style={[styles.planName, { color: colors.primary }]}>Pro</Text>
          <PremiumBadge variant="pro" />
        </View>
        <Text style={styles.planPrice}>$4.99 / mo</Text>
        {PRO_FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
        <Button
          label="Coming soon — Pro"
          variant="secondary"
          onPress={() => {
            trackPremiumClick('paywall_pro');
            useSubscriptionStore.getState().setPlan('pro');
          }}
        />
      </Card>

      <Card elevated style={[styles.planCard, styles.premiumBorder]}>
        <View style={styles.planRow}>
          <Text style={[styles.planName, { color: colors.accent }]}>Premium</Text>
          <PremiumBadge variant="premium" />
        </View>
        <Text style={styles.planPrice}>$9.99 / mo</Text>
        {PREMIUM_FEATURES.map((f) => (
          <Text key={f} style={styles.feature}>
            ✓ {f}
          </Text>
        ))}
        <Button
          label="Coming soon — Premium"
          onPress={() => {
            trackPremiumClick('paywall_premium');
            useSubscriptionStore.getState().setPlan('premium');
          }}
        />
        <Button
          label="Compare all plans"
          variant="ghost"
          onPress={() => navigation.navigate('ComparePlans')}
        />
      </Card>

      <Text style={styles.legal}>Payments via App Store / Play Store (RevenueCat) — not connected yet.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  close: { alignSelf: 'flex-end', padding: spacing.sm },
  hero: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  heroTitle: { ...typography.h1, color: '#fff' },
  heroSub: { ...typography.body, color: 'rgba(255,255,255,0.9)', marginTop: spacing.sm },
  planCard: { marginBottom: spacing.md, gap: spacing.xs },
  premiumBorder: { borderColor: colors.accent, borderWidth: 1 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planName: { ...typography.h2, color: colors.text },
  planPrice: { ...typography.h3, color: colors.textSecondary, marginVertical: spacing.sm },
  feature: { ...typography.body, color: colors.textSecondary },
  current: { ...typography.caption, color: colors.primary, marginTop: spacing.sm, fontWeight: '700' },
  legal: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
