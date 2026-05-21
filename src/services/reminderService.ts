import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';
import { logger } from '@/utils/logger';

export interface Reminder {
  id: string;
  userId: string;
  targetType: 'TASK' | 'GOAL' | 'PROJECT' | 'CUSTOM';
  targetId?: string;
  title: string;
  note?: string;
  triggerType: 'TIME' | 'LOCATION' | 'BOTH';
  schedule: any;
  geo?: any;
  createdAt: string;
  updatedAt: string;
}

class ReminderServiceClass {
  // Get all reminders for the current user
  async getReminders(params?: {
    page?: number;
    limit?: number;
    targetType?: string;
    triggerType?: string;
  }): Promise<ApiResponse<Reminder[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.targetType) queryParams.append('targetType', params.targetType);
      if (params?.triggerType) queryParams.append('triggerType', params.triggerType);

      const response = await apiClient.get<ApiResponse<Reminder[]>>(
        `/reminders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to get reminders');
      }

      return response;
    } catch (error) {
      logger.error('Get reminders error:', error);
      throw error;
    }
  }

  // Get upcoming reminders (next 7 days)
  async getUpcomingReminders(): Promise<Reminder[]> {
    try {
      const response = await this.getReminders({ limit: 100 });
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

   
      // Filter reminders that have a schedule with time information
      const upcoming = response.data.filter(reminder => {
        if (reminder.triggerType !== 'TIME') {
          console.log('Reminder not TIME type:', reminder.triggerType);
          return false;
        }
        
        // For routine reminders, check the schedule
        if (reminder.schedule?.routineId) {
          // Calculate reminder time (which is before the routine occurrence)
          const reminderTime = this.calculateReminderTime(reminder);
          const isInRange = reminderTime >= now && reminderTime <= sevenDaysFromNow;
      
          return isInRange;
        }
        
        return false;
      });

       return upcoming.sort((a, b) => {
        const aTime = this.calculateReminderTime(a);
        const bTime = this.calculateReminderTime(b);
        return aTime.getTime() - bTime.getTime();
      });
    } catch (error) {
      logger.error('Get upcoming reminders error:', error);
      console.error('Get upcoming reminders error:', error);
      return [];
    }
  }

  // Calculate the actual reminder time (routine time minus reminderBefore)
  private calculateReminderTime(reminder: Reminder): Date {
    const schedule = reminder.schedule;
    if (!schedule?.time || !schedule?.routineId) return new Date();
    
    const [hours, minutes] = schedule.time.split(':').map(Number);
    // Calculate next routine occurrence
    const routineOccurrence = this.calculateNextOccurrence(schedule, hours, minutes);
    
    // Subtract reminderBefore to get reminder time
    if (schedule.reminderBefore) {
      const match = schedule.reminderBefore.match(/^(\d+)([hdw])$/);
      if (match) {
        const [, valueStr, unit] = match;
        const value = parseInt(valueStr, 10);
        const reminderTime = new Date(routineOccurrence);
        
        if (unit === 'h') {
          reminderTime.setHours(reminderTime.getHours() - value);
        } else if (unit === 'd') {
          reminderTime.setDate(reminderTime.getDate() - value);
        } else if (unit === 'w') {
          reminderTime.setDate(reminderTime.getDate() - (value * 7));
        }
        
        return reminderTime;
      }
    }
    
    return routineOccurrence;
  }

  private calculateNextOccurrence(schedule: any, hours: number, minutes: number): Date {
    const now = new Date();
    let next = new Date(now);

    if (schedule.frequency === 'DAILY') {
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    } else if (schedule.frequency === 'WEEKLY' && schedule.days && schedule.days.length > 0) {
      const currentDay = now.getDay();
      let soonest: Date | null = null;
      for (const day of schedule.days) {
        const d = new Date(now);
        const delta = (day - currentDay + 7) % 7;
        d.setDate(d.getDate() + delta);
        d.setHours(hours, minutes, 0, 0);
        if (d <= now) {
          d.setDate(d.getDate() + 7);
        }
        if (!soonest || d < soonest) soonest = d;
      }
      next = soonest || next;
    } else if (schedule.frequency === 'MONTHLY' && schedule.day) {
      next.setDate(schedule.day);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next;
  }

}

export const reminderService = new ReminderServiceClass();

