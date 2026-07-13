import { createSelector } from "reselect";
import { Task, TaskStatus } from "@/types/task";
import { isSameDay, differenceInHours } from "date-fns";
import { sortTasksByDueTime } from "@/utils/calendarEngine";

// Memoized selectors to prevent unnecessary rerenders
export const selectTasksForDate = createSelector(
  [(tasks: Task[]) => tasks, (date: Date) => date],
  (tasks, date) => {
    return tasks.filter(
      (task) => task.dueDate && isSameDay(new Date(task.dueDate), date),
    );
  },
);

export const selectUpcomingTasks = createSelector(
  [(tasks: Task[]) => tasks],
  (tasks) => {
    const now = new Date();
    return tasks
      .filter((task) => {
        if (!task.dueDate || task.status === TaskStatus.DONE) return false;
        const diff = differenceInHours(new Date(task.dueDate), now);
        return diff >= 0 && diff <= 24;
      })
      .sort(sortTasksByDueTime);
  },
);