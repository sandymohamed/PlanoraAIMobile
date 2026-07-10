import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';
import { trackPremiumClick } from '@/store/subscriptionStore';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { isPremium } = useSubscriptionStore();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const textDir = { textAlign: isArabic ? 'right' as const : 'left' as const, writingDirection: isArabic ? 'rtl' as const : 'ltr' as const };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      {/* <Text style={[styles.title, dirText()]}>{t('profile.title')}</Text> */}
      <Card elevated>
        <Text style={[styles.name, textDir]}>{user?.name || t('profile.defaultName')}</Text>
        <Text style={[styles.email, textDir]}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{isPremium ? t('profile.premium') : t('profile.freePlan')}</Text>
        </View>
      </Card>

      <MenuItem icon="cog-outline" label={t('profile.settingsAccount')} onPress={() => navigation.navigate('Settings')} />
      <MenuItem icon="crown-outline" label={t('profile.upgradePremium')} onPress={() => { trackPremiumClick('profile'); navigation.navigate('Subscription'); }} highlight />
      <MenuItem icon="chart-timeline-variant" label={t('profile.aiWeeklyReview')} onPress={() => navigation.navigate('WeeklyReview')} />
      <MenuItem icon="target" label={t('navigation.goals')} onPress={() => navigation.navigate('Goals')} />
      <MenuItem icon="repeat" label={t('navigation.routines')} onPress={() => navigation.navigate('Routines')} />
      <MenuItem icon="timer-outline" label={t('profile.focusTimers')} onPress={() => navigation.navigate('Focus')} />
      <MenuItem icon="bell-outline" label={t('profile.remindersAlarms')} onPress={() => navigation.navigate('Alarms')} />
      <MenuItem icon="logout" label={t('profile.signOut')} onPress={logout} danger />
    </ScrollView>
  );
};

type MenuItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  highlight?: boolean;
  danger?: boolean;
};

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onPress, highlight, danger }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  return (
    <TouchableOpacity style={[styles.menuItem, highlight && styles.menuHighlight, { flexDirection: isArabic ? 'row-reverse' : 'row' }]} onPress={onPress}>
      <Icon name={icon} size={22} color={danger ? colors.error : colors.primary} />
      <Text style={[styles.menuLabel, { textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }, danger && { color: colors.error }]}>{label}</Text>
      <Icon name={isArabic ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  name: { ...typography.h2, color: colors.text },
  email: { ...typography.caption, color: colors.textSecondary },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: spacing.sm },
  badgeText: { ...typography.label, color: colors.primary, fontSize: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12, marginBottom: spacing.sm },
  menuHighlight: { borderWidth: 1, borderColor: colors.primary },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
});
