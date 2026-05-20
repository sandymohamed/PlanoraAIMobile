import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.date}>{today}</Text>
      <Card elevated>
        <Text style={styles.section}>Routines today</Text>
        <EventRow time="06:30" title="Morning reset" type="routine" />
        <EventRow time="21:00" title="Evening wind-down" type="routine" />
      </Card>
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.section}>Tasks & reminders</Text>
        <EventRow time="09:00" title="Deep work block" type="task" />
        <EventRow time="14:00" title="Team sync (hidden in MVP)" type="task" />
      </Card>
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Routines')}>
        <Text style={styles.linkText}>Manage routines →</Text>
      </TouchableOpacity>
    </View>
  );
};

const EventRow: React.FC<{ time: string; title: string; type: string }> = ({ time, title, type }) => (
  <View style={styles.event}>
    <Text style={styles.time}>{time}</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.eventTitle}>{title}</Text>
      <Text style={styles.eventType}>{type}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  date: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  section: { ...typography.label, color: colors.textMuted, marginBottom: spacing.md },
  event: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  time: { ...typography.caption, color: colors.primary, width: 48 },
  eventTitle: { ...typography.body, color: colors.text },
  eventType: { ...typography.caption, color: colors.textMuted },
  link: { marginTop: spacing.lg },
  linkText: { color: colors.primary, fontWeight: '600' },
});
