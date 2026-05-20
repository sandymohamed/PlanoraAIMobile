import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';
import { track, AnalyticsEvents } from '@/analytics/posthog';

export const GoalsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.sub}>Turn ambitions into milestones and daily tasks.</Text>
      <Button
        label="Generate plan with AI"
        onPress={() => track(AnalyticsEvents.AI_PLAN_GENERATED, { source: 'goals' })}
      />
      <FlatList
        data={[{ id: '1', title: 'Launch side project', progress: 42 }]}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GoalDetail', { id: item.id })}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.progress}>{item.progress}% complete</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm },
  cardTitle: { ...typography.h3, color: colors.text },
  progress: { ...typography.caption, color: colors.primary, marginTop: 4 },
});
