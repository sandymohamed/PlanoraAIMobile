import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityRole,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NativeDateTimePicker from '@react-native-community/datetimepicker';
import { addDays, format, isSameDay, nextSaturday, startOfDay } from 'date-fns';
import { openAndroidPicker } from '@/utils/dateTimePicker';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type PickerMode = 'date' | 'time' | 'datetime';
type QuickAction = 'today' | 'tomorrow' | 'weekend' | 'nextWeek';

interface DateTimePickerProps {
  label?: string;
  value?: Date | null;
  mode: PickerMode;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  helperText?: string;
  quickActions?: boolean;
  optionalTime?: boolean;
  hasTime?: boolean;
  onHasTimeChange?: (value: boolean) => void;
  showClear?: boolean;
  clearLabel?: string;
}

const QUICK_ACTIONS: { key: QuickAction; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'weekend', label: 'This Weekend' },
  { key: 'nextWeek', label: 'Next Week' },
];

function dateForQuickAction(action: QuickAction) {
  const now = new Date();
  switch (action) {
    case 'today':
      return startOfDay(now);
    case 'tomorrow':
      return startOfDay(addDays(now, 1));
    case 'weekend': {
      const saturday = nextSaturday(now);
      return startOfDay(isSameDay(saturday, now) ? addDays(now, 7) : saturday);
    }
    case 'nextWeek':
      return startOfDay(addDays(now, 7));
  }
}

function mergeDateAndTime(date: Date, time: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0
  );
}

function formatValue(value: Date | null | undefined, mode: PickerMode, hasTime?: boolean) {
  if (!value) return null;
  if (mode === 'time') return format(value, 'h:mm a');
  if (mode === 'date' || !hasTime) return format(value, 'EEE, MMM d');
  return format(value, 'EEE, MMM d · h:mm a');
}

function PressableRow({
  label,
  value,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.selector}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole={'button' as AccessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
    >
      <Text style={styles.selectorLabel}>{label}</Text>
      <Text style={styles.selectorValue}>{value}</Text>
    </TouchableOpacity>
  );
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  mode,
  onChange,
  placeholder = 'Choose date',
  helperText,
  quickActions = mode !== 'time',
  optionalTime = false,
  hasTime = mode === 'datetime',
  onHasTimeChange,
  showClear = true,
  clearLabel = 'Clear',
}) => {
  const [iosPickerMode, setIosPickerMode] = useState<'date' | 'time' | null>(null);
  const pickerAnim = useRef(new Animated.Value(0)).current;

  const displayValue = useMemo(() => formatValue(value, mode, hasTime), [hasTime, mode, value]);

  useEffect(() => {
    Animated.timing(pickerAnim, {
      toValue: iosPickerMode ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [iosPickerMode, pickerAnim]);

  const baseValue = value || new Date();

  const applyDate = (date: Date) => {
    if ((mode === 'datetime' || optionalTime) && hasTime && value) {
      onChange(mergeDateAndTime(date, value));
      return;
    }
    onChange(startOfDay(date));
  };

  const applyTime = (time: Date) => {
    const baseDate = value || new Date();
    if (mode === 'time') {
      onChange(time);
      return;
    }
    onChange(mergeDateAndTime(baseDate, time));
  };

  const openDatePicker = () => {
    if (openAndroidPicker(baseValue, 'date', applyDate)) return;
    setIosPickerMode((current) => (current === 'date' ? null : 'date'));
  };

  const openTimePicker = () => {
    if (openAndroidPicker(baseValue, 'time', applyTime)) return;
    setIosPickerMode((current) => (current === 'time' ? null : 'time'));
  };

  const openDateTimePicker = () => {
    if (mode === 'time') {
      openTimePicker();
      return;
    }
    if (mode === 'date' || optionalTime) {
      openDatePicker();
      return;
    }
    if (openAndroidPicker(baseValue, 'datetime', onChange)) return;
    setIosPickerMode((current) => (current === 'date' ? null : 'date'));
  };

  const handleQuickAction = (action: QuickAction) => {
    const date = dateForQuickAction(action);
    if ((mode === 'datetime' || optionalTime) && hasTime && value) {
      onChange(mergeDateAndTime(date, value));
      return;
    }
    onChange(date);
  };

  const toggleTime = () => {
    const next = !hasTime;
    onHasTimeChange?.(next);
    if (next) {
      applyTime(value || new Date());
    }
  };

  const showDateControl = mode === 'date' || mode === 'datetime';
  const showTimeControl = mode === 'time' || ((mode === 'datetime' || optionalTime) && hasTime);

  return (
    <View style={styles.card}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {quickActions && showDateControl ? (
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickChip}
              onPress={() => handleQuickAction(action.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Set ${action.label}`}
            >
              <Text style={styles.quickText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          {showClear ? (
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => onChange(null)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={clearLabel}
            >
              <Text style={styles.quickText}>{clearLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <PressableRow
        label={mode === 'time' ? 'Time' : 'Custom Date'}
        value={mode === 'time' ? displayValue || 'Select time' : displayValue || placeholder}
        onPress={openDateTimePicker}
        accessibilityLabel={mode === 'time' ? 'Select time' : 'Select custom date'}
      />

      {optionalTime && showDateControl && value ? (
        <TouchableOpacity
          style={[styles.timeToggle, hasTime && styles.timeToggleActive]}
          onPress={toggleTime}
          activeOpacity={0.85}
          accessibilityRole="switch"
          accessibilityState={{ checked: hasTime }}
          accessibilityLabel="Enable reminder time"
        >
          <Text style={[styles.timeToggleText, hasTime && styles.timeToggleTextActive]}>
            {hasTime ? 'Reminder time on' : 'Add reminder time'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {showTimeControl && mode !== 'time' ? (
        <PressableRow
          label="Time"
          value={value ? format(value, 'h:mm a') : 'Select time'}
          onPress={openTimePicker}
          accessibilityLabel="Select reminder time"
        />
      ) : null}

      <View style={styles.footerRow}>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : <View />}
        {showClear && value ? (
          <TouchableOpacity onPress={() => onChange(null)} accessibilityRole="button">
            <Text style={styles.clear}>{clearLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {iosPickerMode && Platform.OS === 'ios' ? (
        <Animated.View
          style={[
            styles.iosPicker,
            {
              opacity: pickerAnim,
              transform: [
                {
                  translateY: pickerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <NativeDateTimePicker
            value={baseValue}
            mode={iosPickerMode}
            display="spinner"
            themeVariant="dark"
            onChange={(_, picked) => {
              if (!picked) return;
              if (iosPickerMode === 'date') applyDate(picked);
              else applyTime(picked);
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

export function getNextAlarmDateForTime(time: Date, customDate?: Date | null) {
  const now = new Date();
  const date = customDate || now;
  const candidate = mergeDateAndTime(date, time);
  if (customDate) return candidate;
  if (candidate.getTime() > now.getTime()) return candidate;
  return addDays(candidate, 1);
}

export function formatTimeValue(value: Date) {
  return format(value, 'h:mm a');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quickText: { ...typography.caption, color: colors.text },
  selector: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  selectorLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  selectorValue: { ...typography.h3, color: colors.text },
  timeToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  timeToggleActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  timeToggleText: { ...typography.caption, color: colors.textSecondary },
  timeToggleTextActive: { color: colors.primary, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  helper: { ...typography.caption, color: colors.textMuted, flex: 1 },
  clear: { ...typography.caption, color: colors.error, fontWeight: '600' },
  iosPicker: {
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
});
