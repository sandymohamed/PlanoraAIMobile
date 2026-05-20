import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

export const GoalDetailScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Goal roadmap</Text>
    <Text style={styles.body}>Milestones and AI-generated tasks appear here. Wire to goalStore + /goals/:id API.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
});
