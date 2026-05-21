import { Task, TaskPriority } from '@/types/task';
import { CreateAlarmData } from '@/types/alarm';
import { alarmService } from './alarmApiService';

class TaskAlarmService {
  /**
   * Creates an alarm for a task if it has a specific time
   */
  async createAlarmForTask(task: Task): Promise<string | null> {
    try {
      // Only create alarm if task has both date and time
      if (!task.dueDate || !task.dueTime) {
        return null;
      }

      // Parse the task time
      const [hours, minutes] = task.dueTime.split(':');
      const taskDate = new Date(task.dueDate);
      const alarmTime = new Date(taskDate);
      alarmTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      // Check if alarm time is in the future
      if (alarmTime <= new Date()) {
        return null;
      }

      // Create alarm data
      const alarmData: CreateAlarmData = {
        title: `Task: ${task.title}`,
        time: alarmTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        enabled: true,
        recurrenceRule: undefined, // One-time alarm for tasks
        toneUrl: this.getToneForPriority(task.priority),
        smartWakeWindow: 5,
        snoozeConfig: {
          duration: 5, // 5 minutes snooze
          maxSnoozes: 3,
        },
      };

      // Create the alarm
      const alarm = await alarmService.createAlarm(alarmData); 
      
      return alarm.id;
    } catch (error) {
      return null;
    }
  }

  /**
   * Updates an existing alarm for a task
   */
  async updateAlarmForTask(task: Task, alarmId: string): Promise<boolean> {
    try {
      if (!task.dueDate || !task.dueTime) {
        // If no time, disable the alarm
        await alarmService.updateAlarm(alarmId, { enabled: false });
        return true;
      }

      // Parse the task time
      const [hours, minutes] = task.dueTime.split(':');
      const taskDate = new Date(task.dueDate);
      const alarmTime = new Date(taskDate);
      alarmTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      // Update alarm data
      const updateData = {
        title: `Task: ${task.title}`,
        time: alarmTime.toISOString(),
        enabled: alarmTime > new Date(),
        toneUrl: this.getToneForPriority(task.priority),
      };

      await alarmService.updateAlarm(alarmId, updateData);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Deletes an alarm for a task
   */
  async deleteAlarmForTask(alarmId: string): Promise<boolean> {
    try {
      await alarmService.deleteAlarm(alarmId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets appropriate tone for task priority
   */
  private getToneForPriority(priority: TaskPriority): string | undefined {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'urgent'; // You can define these tones
      case TaskPriority.HIGH:
        return 'classic';
      case TaskPriority.MEDIUM:
        return 'gentle';
      case TaskPriority.LOW:
        return 'nature';
      default:
        return 'default';
    }
  }

  /**
   * Checks if a task should have an alarm
   */
  shouldHaveAlarm(task: Task): boolean {
    return !!(task.dueDate && task.dueTime);
  }

  /**
   * Gets the alarm time for a task
   */
  getAlarmTime(task: Task): Date | null {
    if (!task.dueDate || !task.dueTime) {
      return null;
    }

    const [hours, minutes] = task.dueTime.split(':');
    const taskDate = new Date(task.dueDate);
    const alarmTime = new Date(taskDate);
    alarmTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    return alarmTime;
  }
}

export const taskAlarmService = new TaskAlarmService();
