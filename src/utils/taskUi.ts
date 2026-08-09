import { colors } from "@/theme/tokens";
import { Task, TaskPriority, TaskStatus, TaskStatusFilter } from "@/types/task";
import i18n, { formatDate } from "@/i18n";

/** Start of local calendar day */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Due date as ms at start of day; tasks without due date sort last */
export function getTaskDueSortKey(task: Task): number {
  if (!task.dueDate) return Number.MAX_SAFE_INTEGER;
  return startOfDay(new Date(task.dueDate)).getTime();
}

/** Incomplete task whose due date is before today */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === TaskStatus.DONE || task.status === TaskStatus.ARCHIVED)
    return false;
  const due = startOfDay(new Date(task.dueDate));
  const today = startOfDay(new Date());
  return due.getTime() < today.getTime();
}

/**
 * Overdue incomplete tasks first (oldest due on top), then upcoming by due date ascending,
 * then tasks without a due date.
 */
export function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aOver = isTaskOverdue(a);
    const bOver = isTaskOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;

    const aKey = getTaskDueSortKey(a);
    const bKey = getTaskDueSortKey(b);
    if (aKey !== bKey) return aKey - bKey;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

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

export function translateTaskPriority(priority: TaskPriority): string {
  return i18n.t(`tasks.priority.${priority}`, { defaultValue: priority });
}

export function translateTaskStatus(status: TaskStatus): string {
  return i18n.t(`tasks.status.${status}`, { defaultValue: status });
}
export function translateTaskFilters(filters: TaskStatusFilter): string {
  return i18n.t(`tasks.filter.${filters}`, { defaultValue: filters });
}

export function formatDueLabel(
  dueDate?: string,
  dueTime?: string,
  options?: { overdue?: boolean },
): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formattedDate = formatDate(date, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear()
      ? { year: "numeric" as const }
      : {}),
  });

  let label: string;
  if (options?.overdue) {
    label = i18n.t("tasks.dueDate.overdue", { date: formattedDate });
  } else if (date.toDateString() === today.toDateString()) {
    label = i18n.t("common.today");
  } else if (date.toDateString() === tomorrow.toDateString()) {
    label = i18n.t("common.tomorrow");
  } else {
    label = formattedDate;
  }

  if (dueTime) label += ` · ${dueTime}`;
  return label;
}
export function formatDueDateTime(dueDate?: string): string | null | any {
  if (!dueDate) return null;
  console.log("Formatting due date:", dueDate);
  const date = new Date(dueDate);

  console.log("Formatting due date:", date);
  const today = new Date();
  console.log("Today:", today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formattedDate = formatDate(date, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear()
      ? { year: "numeric" as const }
      : {}),
  });

  let label: string = "dueDateTime";

  return `${date}`;
}
