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
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography, radius } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { waitlistService } from '@/services/waitlistService';
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { showError } from '@/components/ConfirmationDialog';

const PREMIUM_FEATURE_KEYS = ['unlimitedAi', 'analytics', 'reports', 'future'] as const;
const FEATURE_ICONS: Record<(typeof PREMIUM_FEATURE_KEYS)[number], string> = {
  unlimitedAi: 'infinity',
  analytics: 'chart-line',
  reports: 'lightbulb-on',
  future: 'rocket-launch',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const textDir = {
    textAlign: isArabic ? ('right' as const) : ('left' as const),
    writingDirection: isArabic ? ('rtl' as const) : ('ltr' as const),
  };
  const rowDir = { flexDirection: isArabic ? ('row-reverse' as const) : ('row' as const) };

  const aiPlansRemaining = useSubscriptionStore((s) => s.aiPlansRemaining);
  const aiPlansLimit = useSubscriptionStore((s) => s.aiPlansLimit);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const fetchAIUsage = useSubscriptionStore((s) => s.fetchAIUsage);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    track(AnalyticsEvents.PAYWALL_VIEWED, { source: 'paywall' });
    track(AnalyticsEvents.PREMIUM_PAGE_OPENED, { source: 'paywall' });
    fetchAIUsage();
  }, [fetchAIUsage]);

  const remaining = aiPlansRemaining ?? 0;
  const remainingLabel = isPremium
    ? t('paywall.usage.unlimited')
    : aiPlansLimit != null
      ? t('paywall.usage.remainingWithLimit', { remaining, limit: aiPlansLimit })
      : t('paywall.usage.remaining', { remaining });

  const handleJoin = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      showError(t('paywall.errors.invalidEmailTitle'), t('paywall.errors.invalidEmailMessage'));
      return;
    }
    setSubmitting(true);
    track(AnalyticsEvents.PREMIUM_INTEREST, { source: 'paywall' });
    try {
      await waitlistService.join(trimmed, 'paywall');
      track(AnalyticsEvents.WAITLIST_JOINED, { source: 'paywall' });
      setJoined(true);
    } catch {
      showError(t('paywall.errors.waitlistTitle'), t('paywall.errors.waitlistMessage'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={[styles.close, { alignSelf: isArabic ? 'flex-start' : 'flex-end' }]}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.hero}>
        <View style={[styles.badge, rowDir]}>
          <Icon name="crown" size={16} color="#fff" />
          <Text style={styles.badgeText}>{t('paywall.badge')}</Text>
        </View>
        <Text style={[styles.heroTitle, textDir]}>{t('paywall.heroTitle')}</Text>
        <Text style={[styles.heroSub, textDir]}>{t('paywall.heroSub')}</Text>
      </LinearGradient>

      <View style={[styles.usagePill, rowDir]}>
        <Icon name="robot-happy-outline" size={16} color={colors.accent} />
        <Text style={[styles.usageText, textDir]}>{remainingLabel}</Text>
      </View>

      <Text style={[styles.sectionTitle, textDir]}>{t('paywall.sectionTitle')}</Text>
      {PREMIUM_FEATURE_KEYS.map((key) => (
        <Card key={key} style={styles.featureCard}>
          <View style={[styles.featureRow, rowDir]}>
            <View style={styles.featureIcon}>
              <Icon name={FEATURE_ICONS[key]} size={22} color={colors.primary} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={[styles.featureTitle, textDir]}>{t(`paywall.features.${key}.title`)}</Text>
              <Text style={[styles.featureSubtitle, textDir]}>{t(`paywall.features.${key}.subtitle`)}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Card elevated style={styles.waitlistCard}>
        {joined ? (
          <View style={styles.joinedWrap}>
            <Icon name="check-circle" size={40} color={colors.success} />
            <Text style={[styles.joinedTitle, textDir]}>{t('paywall.waitlist.joinedTitle')}</Text>
            <Text style={styles.joinedSub}>{t('paywall.waitlist.joinedSub')}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.waitlistTitle, textDir]}>{t('paywall.waitlist.title')}</Text>
            <Text style={[styles.waitlistSub, textDir]}>{t('paywall.waitlist.subtitle')}</Text>
            <TextInput
              style={[styles.input, textDir]}
              placeholder={t('paywall.waitlist.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!submitting}
            />
            <Button
              label={submitting ? t('paywall.waitlist.joining') : t('paywall.waitlist.notifyMe')}
              onPress={handleJoin}
              disabled={submitting}
            />
            {submitting ? <ActivityIndicator style={{ marginTop: spacing.sm }} color={colors.primary} /> : null}
          </>
        )}
      </Card>

      <Text style={styles.legal}>
        {t('paywall.legal', { limit: aiPlansLimit ?? 3 })}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  close: { padding: spacing.sm },
  hero: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  badge: {
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
  featureRow: { alignItems: 'center', gap: spacing.md },
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
