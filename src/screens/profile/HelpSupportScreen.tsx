import React from 'react';
import { ScrollView, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '@/theme/tokens';

const SUPPORT_EMAIL = 'support@planora.app';

export const HelpSupportScreen: React.FC = () => (
  <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
    <Text style={styles.title}>Need help?</Text>
    <Text style={styles.body}>
      Email us for account issues, alarm troubleshooting, or billing questions. We typically respond within 1–2 business days.
    </Text>
    <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
      <Icon name="email-outline" size={22} color={colors.primary} />
      <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
    </TouchableOpacity>
    <Text style={[styles.body, { marginTop: spacing.lg }]}>
      For alarm reliability on Android: grant exact alarm and notification permissions, and disable battery optimization for Planora.
    </Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  link: { ...typography.body, color: colors.primary },
});
