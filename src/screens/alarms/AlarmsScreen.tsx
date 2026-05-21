import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAlarmStore } from '@/store/alarmStore';
import { reliableAlarmService } from '@/services/ReliableAlarmService';
import { colors, spacing, typography } from '@/theme/tokens';
import { format } from 'date-fns';

export const AlarmsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { alarms, timers, loading, fetchAlarms, fetchTimers, toggleAlarm, deleteAlarm } = useAlarmStore();

  useFocusEffect(
    useCallback(() => {
      reliableAlarmService.initialize().catch(() => {});
      fetchAlarms(1, 100, undefined);
      fetchTimers(1, 50);
    }, [fetchAlarms, fetchTimers])
  );

  const onToggle = async (id: string) => {
    try {
      await toggleAlarm(id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const onDelete = (id: string, title: string) => {
    Alert.alert('Delete alarm', title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteAlarm(id).catch((e: any) => Alert.alert('Error', e.message)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alarms & timers</Text>
      <Text style={styles.sub}>Native Android scheduling via AlarmManager</Text>

      {loading && alarms.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <>
          <Text style={styles.section}>Alarms</Text>
          <FlatList
            data={alarms}
            keyExtractor={(a) => a.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.empty}>No alarms</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowMeta}>
                    {format(new Date(item.time), 'EEE MMM d · h:mm a')}
                  </Text>
                </View>
                <Switch value={item.enabled} onValueChange={() => onToggle(item.id)} />
                <TouchableOpacity onPress={() => onDelete(item.id, item.title)}>
                  <Icon name="trash-can-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          />

          <Text style={styles.section}>Timers</Text>
          {timers.map((t) => (
            <View key={t.id} style={styles.row}>
              <Text style={styles.rowTitle}>{t.title}</Text>
              <Text style={styles.rowMeta}>
                {Math.floor(t.remainingTime / 60)}m left · {t.isRunning ? 'Running' : 'Paused'}
              </Text>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AlarmCreate')}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
  section: { ...typography.label, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  empty: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
