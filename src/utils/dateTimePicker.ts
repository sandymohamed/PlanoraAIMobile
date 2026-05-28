import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

type PickerMode = 'date' | 'time' | 'datetime';

/**
 * Android: use imperative API (avoids dismiss() crash when unmounting <DateTimePicker />).
 * iOS: returns false — caller should show inline <DateTimePicker />.
 */
export function openAndroidPicker(
  value: Date,
  mode: PickerMode,
  onPick: (date: Date) => void
): boolean {
  if (Platform.OS !== 'android') return false;

  if (mode === 'datetime') {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'dismissed' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, timeDate) => {
            if (timeEvent.type === 'dismissed' || !timeDate) return;
            onPick(timeDate);
          },
        });
      },
    });
    return true;
  }

  DateTimePickerAndroid.open({
    value,
    mode: mode === 'time' ? 'time' : 'date',
    onChange: (event, date) => {
      if (event.type === 'dismissed' || !date) return;
      onPick(date);
    },
  });
  return true;
}
