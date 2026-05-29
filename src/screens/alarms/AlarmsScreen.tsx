import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppIcon as Icon } from '@/components/ui/AppIcon';
import { useAlarmStore } from '@/store/alarmStore';
import { alarmFixService } from '@/services/AlarmFixService';
import { alarmPermissionService } from '@/services/AlarmPermissionService';
import { groupAlarmsByRecurrence, getAlarmStatus, statusColor } from '@/utils/alarmUi';
import { validateAndCleanPendingState } from '@/utils/alarmCleanup';
import { showDeleteConfirmation } from '@/components/ConfirmationDialog';
import { colors, spacing, typography } from '@/theme/tokens';
import { format } from 'date-fns';
import { getApiErrorMessage } from '@/utils/apiError';

export const AlarmsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { alarms, timers, loading, fetchAlarms, fetchTimers, toggleAlarm, deleteAlarm } = useAlarmStore();

  useFocusEffect(
    useCallback(() => {
      alarmFixService.initialize().catch(() => {});
      alarmPermissionService.showPermissionSetupDialog().catch(() => {});
      fetchAlarms(1, 100, undefined);
      fetchTimers(1, 50);
    }, [fetchAlarms, fetchTimers])
  );

  useEffect(() => {
    validateAndCleanPendingState(alarms, timers).catch(() => {});
  }, [alarms, timers]);

  const onToggle = async (id: string) => {
    try {
      await toggleAlarm(id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const onDelete = (id: string, title: string) => {
    showDeleteConfirmation(title, async () => {
      try {
        await deleteAlarm(id);
      } catch (e) {
        Alert.alert('Error', getApiErrorMessage(e));
      }
    }, 'alarm');
  };

  return (
    <View style={styles.container}>
      {loading && alarms.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Alarms & timers</Text>
          <Text style={styles.sub}>Snooze from the alarm notification when it rings (+5 min)</Text>

          <TouchableOpacity
            style={styles.permBanner}
            onPress={() => alarmPermissionService.requestAllPermissions()}
          >
            <Icon name="shield-check-outline" size={18} color={colors.primary} />
            <Text style={styles.permText}>Tap to verify alarm permissions</Text>
          </TouchableOpacity>

          {groupAlarmsByRecurrence(alarms).map((group) => (
            <View key={group.key}>
              <Text style={styles.section}>
                {group.label} ({group.items.length})
              </Text>
              {group.items.map((item) => {
                const status = getAlarmStatus(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.row, !item.enabled && styles.rowDisabled]}
                    onPress={() => navigation.navigate('AlarmEdit', { alarmId: item.id })}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.statusDot, { backgroundColor: statusColor(status) }]} />
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, !item.enabled && styles.textMuted]}>{item.title}</Text>
                      <Text style={styles.rowMeta}>
                        {format(new Date(item.time), 'EEE MMM d · h:mm a')}
                        {status === 'soon' ? ' · Soon' : ''}
                        {status === 'past' ? ' · Past' : ''}
                      </Text>
                    </View>
                    <Switch value={item.enabled} onValueChange={() => onToggle(item.id)} />
                    <TouchableOpacity
                      onPress={() => onDelete(item.id, item.title)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Icon name="trash-can-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {alarms.length === 0 && <Text style={styles.empty}>No alarms</Text>}

          <Text style={styles.section}>Timers</Text>
          {timers.length === 0 ? (
            <Text style={styles.empty}>No timers</Text>
          ) : (
            timers.map((t) => (
              <View key={t.id} style={styles.row}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{t.title}</Text>
                  <Text style={styles.rowMeta}>
                    {Math.floor(t.remainingTime / 60)}m left · {t.isRunning ? 'Running' : 'Paused'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AlarmCreate')}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  permText: { ...typography.caption, color: colors.primary },
  section: { ...typography.label, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowDisabled: { opacity: 0.65 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  textMuted: { color: colors.textMuted },
  rowMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
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
    elevation: 6,
  },
});
