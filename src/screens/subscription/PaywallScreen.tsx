import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { waitlistService } from '@/services/waitlistService';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { showError } from '@/components/ConfirmationDialog';

const PREMIUM_FEATURES: { icon: string; title: string; subtitle: string }[] = [
  {
    icon: 'infinity',
    title: 'Unlimited AI Plans',
    subtitle: 'Generate as many AI goal plans as you need — no monthly cap.',
  },
  {
    icon: 'chart-line',
    title: 'Advanced Analytics',
    subtitle: 'Deeper insight into goals, routines, and where your time goes.',
  },
  {
    icon: 'lightbulb-on',
    title: 'Smart Productivity Reports',
    subtitle: 'Personalized weekly reviews with actionable recommendations.',
  },
  {
    icon: 'rocket-launch',
    title: 'Future Premium Features',
    subtitle: 'Early access to collaboration, themes, and everything we ship next.',
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const aiPlansRemaining = useSubscriptionStore((s) => s.aiPlansRemaining);
  const aiPlansLimit = useSubscriptionStore((s) => s.aiPlansLimit);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const fetchAIUsage = useSubscriptionStore((s) => s.fetchAIUsage);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    track(AnalyticsEvents.PAYWALL_VIEWED, { source: 'paywall' });
    fetchAIUsage();
  }, [fetchAIUsage]);

  const remainingLabel = isPremium
    ? 'Unlimited AI plans'
    : aiPlansLimit != null
    ? `${aiPlansRemaining ?? 0} of ${aiPlansLimit} AI plans remaining this month`
    : `${aiPlansRemaining ?? 0} AI plans remaining this month`;

  const handleJoin = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      showError('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    track(AnalyticsEvents.PREMIUM_INTEREST, { source: 'paywall' });
    try {
      await waitlistService.join(trimmed, 'paywall');
      track(AnalyticsEvents.WAITLIST_JOINED, { source: 'paywall' });
      setJoined(true);
    } catch {
      showError('Something went wrong', 'We could not add you to the waitlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.close} onPress={() => navigation.goBack()}>
        <Icon name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.hero}>
        <View style={styles.badge}>
          <Icon name="crown" size={16} color="#fff" />
          <Text style={styles.badgeText}>PREMIUM</Text>
        </View>
        <Text style={styles.heroTitle}>Premium is coming soon</Text>
        <Text style={styles.heroSub}>
          We're building the most powerful version of Planora. Join the waitlist and be first to know.
        </Text>
      </LinearGradient>

      <View style={styles.usagePill}>
        <Icon name="robot-happy-outline" size={16} color={colors.accent} />
        <Text style={styles.usageText}>{remainingLabel}</Text>
      </View>

      <Text style={styles.sectionTitle}>What you'll unlock</Text>
      {PREMIUM_FEATURES.map((f) => (
        <Card key={f.title} style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Icon name={f.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Card elevated style={styles.waitlistCard}>
        {joined ? (
          <View style={styles.joinedWrap}>
            <Icon name="check-circle" size={40} color={colors.success} />
            <Text style={styles.joinedTitle}>You're on the list!</Text>
            <Text style={styles.joinedSub}>
              We'll email you the moment Premium launches. Thanks for being an early supporter.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.waitlistTitle}>Join the Premium waitlist</Text>
            <Text style={styles.waitlistSub}>No payment now — just early access when we launch.</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!submitting}
            />
            <Button
              label={submitting ? 'Joining…' : 'Notify me at launch'}
              onPress={handleJoin}
              disabled={submitting}
            />
            {submitting ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} /> : null}
          </>
        )}
      </Card>

      <Text style={styles.legal}>
        Premium pricing and billing are not active yet. The free plan includes {aiPlansLimit ?? 3} AI plans per month.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  close: { alignSelf: 'flex-end', padding: spacing.sm },
  hero: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  badgeText: { ...typography.label, color: '#fff' },
  heroTitle: { ...typography.h1, color: '#fff' },
  heroSub: { ...typography.body, color: 'rgba(255,255,255,0.92)', marginTop: spacing.sm },
  usagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  usageText: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  sectionTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  featureCard: { marginBottom: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: { flex: 1 },
  featureTitle: { ...typography.h3, color: colors.text },
  featureSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  waitlistCard: { marginTop: spacing.sm, borderColor: colors.primary, borderWidth: 1, gap: spacing.sm },
  waitlistTitle: { ...typography.h2, color: colors.text },
  waitlistSub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  joinedWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  joinedTitle: { ...typography.h2, color: colors.text },
  joinedSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  legal: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
