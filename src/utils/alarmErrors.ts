import i18n from '@/i18n';
import { Alarm } from '@/types/alarm';

export type AlarmScheduleErrorInfo = {
  title: string;
  message: string;
  canOpenSettings: boolean;
};

/** Maps native/technical alarm errors to plain-language copy. */
export function getAlarmScheduleErrorInfo(rawMessage: string): AlarmScheduleErrorInfo {
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('exact alarm') ||
    lower.includes('schedule exact') ||
    lower.includes('exact_alarm')
  ) {
    return {
      title: i18n.t('alarms.errors.exactAlarmTitle'),
      message: i18n.t('alarms.errors.exactAlarmMessage'),
      canOpenSettings: true,
    };
  }

  if (
    lower.includes('notification') ||
    lower.includes('post_notifications') ||
    lower.includes('not allowed')
  ) {
    return {
      title: i18n.t('alarms.errors.notificationsTitle'),
      message: i18n.t('alarms.errors.notificationsMessage'),
      canOpenSettings: true,
    };
  }

  if (lower.includes('could not load bundle') || lower.includes('bundle')) {
    return {
      title: i18n.t('alarms.errors.connectionTitle'),
      message: i18n.t('alarms.errors.connectionMessage'),
      canOpenSettings: false,
    };
  }

  if (lower.includes('no_activity') || lower.includes('no current activity')) {
    return {
      title: i18n.t('alarms.errors.genericTitle'),
      message: i18n.t('alarms.errors.genericMessage'),
      canOpenSettings: false,
    };
  }

  return {
    title: i18n.t('alarms.errors.genericTitle'),
    message: i18n.t('alarms.errors.genericMessage'),
    canOpenSettings: true,
  };
}

/** Thrown when the alarm is saved but native scheduling failed. */
export class AlarmScheduleWarning extends Error {
  readonly alarm: Alarm;
  readonly info: AlarmScheduleErrorInfo;

  constructor(alarm: Alarm, rawMessage: string) {
    const info = getAlarmScheduleErrorInfo(rawMessage);
    super(info.message);
    this.name = 'AlarmScheduleWarning';
    this.alarm = alarm;
    this.info = info;
  }
}
