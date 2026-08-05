//src/services/NotificationService
import { logger } from '@/utils/logger';

/** Stub — native alarms via ReliableAlarmService; push notifications optional in Phase 4+. */
class NotificationService {
  scheduleTimer(id: string, title: string, remainingSeconds: number): void {
    logger.debug('notificationService.scheduleTimer (stub)', { id, title, remainingSeconds });
  }

  cancelTimer(id: string): void {
    logger.debug('notificationService.cancelTimer (stub)', { id });
  }

  triggerImmediateTimerNotification(_payload: { id: string; title: string; remainingTime: number }): void {
    logger.debug('notificationService.triggerImmediateTimerNotification (stub)');
  }
}

export const notificationService = new NotificationService();
