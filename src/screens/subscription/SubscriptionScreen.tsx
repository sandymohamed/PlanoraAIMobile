import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { trackPremiumClick } from '@/store/subscriptionStore';

const FREE_FEATURES = ['Up to 3 active goals', '5 AI generations / month', 'Basic routines', 'Basic reminders'];
const PREMIUM_FEATURES = [
  'Unlimited goals',
  'Unlimited AI planning',
  'Advanced routines',
  'Smart AI weekly reviews',
  'Cloud backup',
  'Focus analytics',
  'Premium themes',
];

export const SubscriptionScreen: React.FC = () => (
  <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.hero}>
      <Text style={styles.heroTitle}>Planora Premium</Text>
      <Text style={styles.heroSub}>Unlock your full planning potential</Text>
    </LinearGradient>

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
        label="Upgrade now"
        onPress={() => trackPremiumClick('subscription_screen')}
      />
    </Card>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { padding: spacing.xl, borderRadius: radius.lg, marginBottom: spacing.lg },
  heroTitle: { ...typography.h1, color: '#fff' },
  heroSub: { ...typography.body, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  plan: { marginBottom: spacing.md },
  premiumPlan: { borderColor: colors.primary, borderWidth: 1 },
  planName: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  price: { ...typography.h3, color: colors.accent, marginBottom: spacing.md },
  feature: { ...typography.body, color: colors.textSecondary, marginBottom: 6 },
});
