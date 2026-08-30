import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { apiClient } from '@/services/apiClient';
import { Button } from '@/components/ui/Button';
import { PlanoraColors, spacing, typography,radius } from "@/theme/tokens";
import { usePlanoraStyles } from "@/theme/usePlanoraStyles";
import { track, AnalyticsEvents } from '@/analytics/posthog';
import { useScreenAnalytics } from '@/hooks/useScreenAnalytics';



const createStyles = (colors: PlanoraColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 80 },
  card: { borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  label: { ...typography.label, color: 'rgba(255,255,255,0.7)' },
  score: { fontSize: 64, fontWeight: '800', color: '#fff', marginVertical: spacing.sm },
  scoreLabel: { ...typography.body, color: colors.accent },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { ...typography.h1, color: '#fff' },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  section: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  insight: { ...typography.body, color: colors.text, marginBottom: spacing.sm },
  rec: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
});


export const WeeklyReviewScreen: React.FC = () => {
    const { styles, colors } = usePlanoraStyles(createStyles);
  
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useScreenAnalytics(AnalyticsEvents.WEEKLY_REVIEW_OPENED);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: any }>('/reviews/current')
      .then((res) => {
        setReview(res.data ?? res);
        track(AnalyticsEvents.WEEKLY_REVIEW_VIEWED);
      })
      .catch(() => setReview(null))
      .finally(() => setLoading(false));
  }, []);

  const share = async () => {
    if (!review?.shareableSummary) return;
    await Share.share({ message: review.shareableSummary });
    track(AnalyticsEvents.WEEKLY_REVIEW_SHARED);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Generating your week…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <LinearGradient colors={[colors.gradientStart, '#1A1A24']} style={styles.card}>
        <Text style={styles.label}>YOUR WEEK</Text>
        <Text style={styles.score}>{review?.consistencyScore ?? 0}%</Text>
        <Text style={styles.scoreLabel}>consistency</Text>
        <View style={styles.stats}>
          <Stat value={review?.completedTasks ?? 0} label="Completed" />
          <Stat value={review?.missedTasks ?? 0} label="Missed" />
        </View>
      </LinearGradient>

      <Text style={styles.section}>Insights</Text>
      {(review?.insights || ['You showed up this week.']).map((line: string, i: number) => (
        <Text key={i} style={styles.insight}>✦ {line}</Text>
      ))}

      <Text style={styles.section}>Recommendations</Text>
      {(review?.recommendations || []).map((line: string, i: number) => (
        <Text key={i} style={styles.rec}>→ {line}</Text>
      ))}

      <Button label="Share your week" onPress={share} variant="secondary" />
    </ScrollView>
  );
};

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) =>{
    const { styles, colors } = usePlanoraStyles(createStyles);
  
return  (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
)};
