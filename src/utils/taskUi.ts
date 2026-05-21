import { colors } from '@/theme/tokens';
import { TaskPriority, TaskStatus } from '@/types/task';

export function priorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.URGENT:
      return colors.error;
    case TaskPriority.HIGH:
      return colors.warning;
    case TaskPriority.MEDIUM:
      return colors.primary;
    case TaskPriority.LOW:
      return colors.textMuted;
    default:
      return colors.textSecondary;
  }
}

export function statusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.DONE:
      return colors.success;
    case TaskStatus.IN_PROGRESS:
      return colors.accent;
    case TaskStatus.ARCHIVED:
      return colors.textMuted;
    default:
      return colors.textSecondary;
  }
}

export function formatDueLabel(dueDate?: string, dueTime?: string): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  let label =
    date.toDateString() === today.toDateString()
      ? 'Today'
      : date.toDateString() === tomorrow.toDateString()
        ? 'Tomorrow'
        : date.toLocaleDateString();
  if (dueTime) label += ` · ${dueTime}`;
  return label;
}
