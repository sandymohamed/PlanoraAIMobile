import { Alarm } from '@/types/alarm';

export type AlarmStatus = 'off' | 'past' | 'soon' | 'scheduled';

export function getAlarmStatus(alarm: Alarm): AlarmStatus {
  if (!alarm.enabled) return 'off';
  const t = new Date(alarm.time).getTime();
  const now = Date.now();
  const isOneTime = !alarm.recurrenceRule || alarm.recurrenceRule === 'none';
  if (isOneTime && t < now - 60_000) return 'past';
  if (t - now < 60 * 60 * 1000 && t > now) return 'soon';
  return 'scheduled';
}

export function groupAlarmsByRecurrence(alarms: Alarm[]): { key: string; label: string; items: Alarm[] }[] {
  const order = ['none', 'daily', 'weekdays', 'weekends', 'weekly'];
  const labels: Record<string, string> = {
    none: 'One-time',
    daily: 'Daily',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    weekly: 'Weekly',
  };
  const groups = new Map<string, Alarm[]>();
  for (const a of alarms) {
    const key = a.recurrenceRule || 'none';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  return order
    .filter((k) => groups.has(k))
    .map((k) => ({
      key: k,
      label: labels[k] || k,
      items: groups.get(k)!.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
    }));
}

export function statusColor(status: AlarmStatus): string {
  switch (status) {
    case 'off':
      return '#6b7280';
    case 'past':
      return '#ef4444';
    case 'soon':
      return '#f59e0b';
    default:
      return '#22c55e';
  }
}
