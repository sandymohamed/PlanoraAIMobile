import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';
import { trackPremiumClick } from '@/store/subscriptionStore';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const { tier, isPremium } = useSubscriptionStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.title}>Profile</Text>
      <Card elevated>
        <Text style={styles.name}>{user?.name || 'Planora user'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{isPremium ? 'Premium' : 'Free plan'}</Text>
        </View>
      </Card>

      <MenuItem icon="crown-outline" label="Upgrade to Premium" onPress={() => { trackPremiumClick('profile'); navigation.navigate('Subscription'); }} highlight />
      <MenuItem icon="chart-timeline-variant" label="AI Weekly Review" onPress={() => navigation.navigate('WeeklyReview')} />
      <MenuItem icon="target" label="Goals" onPress={() => navigation.navigate('Goals')} />
      <MenuItem icon="repeat" label="Routines" onPress={() => navigation.navigate('Routines')} />
      <MenuItem icon="timer-outline" label="Focus & timers" onPress={() => navigation.navigate('Focus')} />
      <MenuItem icon="bell-outline" label="Reminders & alarms" onPress={() => {}} />
      <MenuItem icon="logout" label="Sign out" onPress={logout} danger />
    </ScrollView>
  );
};

const MenuItem: React.FC<{ icon: string; label: string; onPress: () => void; highlight?: boolean; danger?: boolean }> = ({
  icon, label, onPress, highlight, danger,
}) => (
  <TouchableOpacity style={[styles.menuItem, highlight && styles.menuHighlight]} onPress={onPress}>
    <Icon name={icon} size={22} color={danger ? colors.error : colors.primary} />
    <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
    <Icon name="chevron-right" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

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
