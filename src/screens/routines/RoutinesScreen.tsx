import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

export const RoutinesScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.sub}>Daily habits that reset and reward consistency.</Text>
    <Card>
      <RoutineItem name="Morning reset" frequency="Daily · 06:30" done={2} total={4} />
      <RoutineItem name="Deep work prep" frequency="Weekdays · 08:00" done={1} total={3} />
    </Card>
  </View>
);

const RoutineItem: React.FC<{ name: string; frequency: string; done: number; total: number }> = ({
  name, frequency, done, total,
}) => (
  <View style={styles.item}>
    <Text style={styles.name}>{name}</Text>
    <Text style={styles.freq}>{frequency}</Text>
    <Text style={styles.progress}>{done}/{total} today</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  item: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  name: { ...typography.h3, color: colors.text },
  freq: { ...typography.caption, color: colors.textMuted },
  progress: { ...typography.caption, color: colors.accent, marginTop: 4 },
});
