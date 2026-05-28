import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type Row = { feature: string; free: string; pro: string; premium: string };

const ROWS: Row[] = [
  { feature: 'Ads', free: 'Yes', pro: 'No', premium: 'No' },
  { feature: 'AI plans / day', free: '3', pro: '15', premium: 'Unlimited' },
  { feature: 'Smart AI', free: '—', pro: '✓', premium: '✓' },
  { feature: 'Analytics', free: 'Basic', pro: 'Advanced', premium: 'Advanced' },
  { feature: 'Routines insights', free: '—', pro: '✓', premium: '✓' },
  { feature: 'Collaboration', free: '—', pro: '—', premium: 'Coming' },
];

export const ComparePlansScreen: React.FC = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Compare plans</Text>
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={[styles.cell, styles.featureCol]}> </Text>
        <Text style={styles.colHead}>Free</Text>
        <Text style={styles.colHead}>Pro</Text>
        <Text style={[styles.colHead, { color: colors.accent }]}>Premium</Text>
      </View>
      {ROWS.map((row) => (
        <View key={row.feature} style={styles.row}>
          <Text style={[styles.cell, styles.featureCol]}>{row.feature}</Text>
          <Text style={styles.cell}>{row.free}</Text>
          <Text style={styles.cell}>{row.pro}</Text>
          <Text style={styles.cell}>{row.premium}</Text>
        </View>
      ))}
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginBottom: spacing.lg },
  table: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSubtle },
  headerRow: { flexDirection: 'row', backgroundColor: colors.surfaceElevated, padding: spacing.sm },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.borderSubtle, padding: spacing.sm },
  cell: { flex: 1, ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  featureCol: { flex: 1.4, textAlign: 'left', color: colors.text, fontWeight: '600' },
  colHead: { flex: 1, ...typography.label, color: colors.text, textAlign: 'center', fontSize: 10 },
});
