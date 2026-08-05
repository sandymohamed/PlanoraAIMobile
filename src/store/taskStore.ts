import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { taskService } from "@/services/taskService";
import {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskFilter,
  TaskPriority,
  TaskStatus,
} from "@/types/task";
import { logger } from "@/utils/logger";
import { track, trackFailure, AnalyticsEvents } from "@/analytics/posthog";
import { consumePendingAnalytics } from "@/analytics/pendingContext";
import { CACHE_CONFIG } from "./types/storeWithCache";

interface TaskState {
  tasks: Task[];
  filteredTasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  isLoaded: boolean;
  lastFetched: string | null;
  error: string | null;
  filter: TaskFilter;
  searchQuery: string;
  sortBy: "createdAt" | "dueDate" | "priority" | "title" | "order";
  sortOrder: "asc" | "desc";
  pendingOperations: Map<
    string,
    { type: "create" | "update" | "delete"; data: any }
  >;
}

interface TaskActions {
  fetchTasks: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    goalId?: string;
    assigneeId?: string;
    skipAlarmSync?: boolean;
    force?: boolean;
  }) => Promise<void>;

  fetchTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;

  needsRefresh: (maxAgeMinutes?: number) => boolean;
  markStale: () => void;

  createTask: (data: CreateTaskData) => Promise<void>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  completeTask: (id: string) => Promise<void>;
  uncompleteTask: (id: string) => Promise<void>;
  assignTask: (id: string, assigneeId: string) => Promise<void>;
  reorderTasks: (fromIndex: number, toIndex: number) => Promise<void>;
  updateTaskOrder: (newTasks: Task[]) => Promise<void>;

  setFilter: (filter: TaskFilter) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (
    sortBy: "createdAt" | "dueDate" | "priority" | "title" | "order",
  ) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  resetToCustomOrder: () => void;
  clearFilters: () => void;
  applyFilters: () => void;

  setCurrentTask: (task: Task | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  addTask: (task: Task) => void;
  updateTaskLocal: (id: string, data: Partial<Task>) => void;
  removeTask: (id: string) => void;
  reset: () => void;
}

type TaskStore = TaskState & TaskActions;

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // State
      tasks: [],
      filteredTasks: [],
      currentTask: null,
      isLoading: false,
      isLoaded: false,
      lastFetched: null,
      error: null,
      filter: {},
      searchQuery: "",
      sortBy: "order",
      sortOrder: "asc",
      pendingOperations: new Map(),

      // Cache management
      needsRefresh: (
        maxAgeMinutes: number = CACHE_CONFIG.TASKS_MAX_AGE_MINUTES,
      ) => {
        const { lastFetched, isLoaded, isLoading } = get();
        if (isLoading) return false;
        if (!isLoaded) return true;
        if (!lastFetched) return true;

        const now = Date.now();
        const lastFetchTime = new Date(lastFetched).getTime();
        const ageInMinutes = (now - lastFetchTime) / (1000 * 60);
        return ageInMinutes > maxAgeMinutes;
      },

      markStale: () => {
        set({ lastFetched: null, isLoaded: false });
      },

      // Data fetching
      fetchTasks: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        priority?: string;
        projectId?: string;
        goalId?: string;
        assigneeId?: string;
        skipAlarmSync?: boolean;
        force?: boolean;
      }) => {
        const { needsRefresh, isLoaded } = get();

        // Skip fetch if cache is fresh and not forced
        if (!params?.force && isLoaded && !needsRefresh()) {
          logger.info("Task cache is fresh, skipping fetch");
          return;
        }

        try {
          set({ isLoading: true, error: null });

          const { skipAlarmSync, ...fetchParams } = params ?? {};
          if (
            !params?.goalId &&
            !params?.projectId &&
            !params?.assigneeId &&
            !params?.limit
          ) {
            fetchParams.limit = 1000;
            fetchParams.page = 1;
          }

          logger.info("Fetching tasks with params:", fetchParams);
          const response = await taskService.getTasks(fetchParams);
          const serverTasks = response;

          logger.info(`Fetched ${serverTasks.length} tasks from server`);

          // Sort tasks by order field
          const sortedServerTasks = serverTasks.sort(
            (a, b) => (a.order || 0) - (b.order || 0),
          );

          // Merge with existing tasks to preserve optimistic updates
          const currentTasks = get().tasks;
          const serverTaskIds = new Set(sortedServerTasks.map((t) => t.id));

          // Preserve pending operations
          const pendingOps = get().pendingOperations;
          const pendingTaskIds = new Set(
            Array.from(pendingOps.values())
              .filter((op) => op.type === "create")
              .map((op) => op.data.id),
          );

          // Merge strategy: Server tasks + pending local tasks
          let mergedTasks = [...sortedServerTasks];

          // Add pending local tasks that don't exist on server
          pendingTaskIds.forEach((id) => {
            if (!serverTaskIds.has(id)) {
              const pendingTask = currentTasks.find((t) => t.id === id);
              if (pendingTask) {
                mergedTasks.push(pendingTask);
              }
            }
          });

          // Sort merged tasks by order
          const sortedMergedTasks = mergedTasks.sort(
            (a, b) => (a.order || 0) - (b.order || 0),
          );

          set({
            tasks: sortedMergedTasks,
            filteredTasks: sortedMergedTasks,
            isLoading: false,
            isLoaded: true,
            lastFetched: new Date().toISOString(),
          });

          // Apply current filters
          get().applyFilters();

          // Fetch and schedule alarms after tasks are loaded
          if (!skipAlarmSync) {
            try {
              const { useAlarmStore } = require("./alarmStore");
              const alarmStore = useAlarmStore.getState();
              // Only fetch if needs refresh
              if (alarmStore.needsRefresh && alarmStore.needsRefresh()) {
                alarmStore.fetchAlarms(1, 100, true).catch((error: any) => {
                  logger.error(
                    "Failed to fetch alarms after tasks loaded:",
                    error,
                  );
                });
              }
            } catch (error) {
              // Ignore if alarmStore is not available
              logger.error("Fetch tasks Alarms error:", error);
            }
          }
        } catch (error: any) {
          logger.error("Fetch tasks error:", error);
          set({
            error: error.message || "Failed to fetch tasks",
            isLoading: false,
          });
        }
      },

      fetchTask: async (id: string) => {
        try {
          set({ isLoading: true, error: null });

          const task = await taskService.getTask(id);

          set((state) => ({
            currentTask: task,
            tasks: state.tasks.map((t) => (t.id === id ? task : t)),
            filteredTasks: state.filteredTasks.map((t) =>
              t.id === id ? task : t,
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          logger.error("Fetch task error:", error);
          set({
            error: error.message || "Failed to fetch task",
            isLoading: false,
          });
        }
      },

      refreshTasks: async () => {
        await get().fetchTasks({ force: true });
      },

      // CRUD operations with optimistic updates
      createTask: async (data: CreateTaskData) => {
        // Optimistic update
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const optimisticTask: Task = {
          id: tempId,
          title: data.title,
          description: data.description || "",
          status: data.status || TaskStatus.TODO,
          priority: data.priority || TaskPriority.MEDIUM,
          dueDate: data.dueDate,
          dueTime: data.dueTime,
          projectId: data.projectId,
          goalId: data.goalId,
          assigneeId: data.assigneeId,
          tags: data.tags || [],
          order: get().tasks.length,
          metadata: data.metadata || {},
          createdBy: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
        };

        // Track pending operation
        const pendingOps = get().pendingOperations;
        pendingOps.set(tempId, { type: "create", data: optimisticTask });
        set({ pendingOperations: pendingOps });

        // Add optimistically
        get().addTask(optimisticTask);

        try {
          set({ isLoading: true, error: null });

          const filteredData = Object.fromEntries(
            Object.entries(data).filter(([key, value]) => {
              if (key === "description") return true;
              return value !== undefined;
            }),
          ) as CreateTaskData;
          filteredData.description = filteredData.description ?? "";

          const task = await taskService.createTask(filteredData);

          // Remove pending operation
          const updatedPendingOps = get().pendingOperations;
          updatedPendingOps.delete(tempId);
          set({ pendingOperations: updatedPendingOps });

          // Replace optimistic with real task
          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === tempId ? task : t)),
            filteredTasks: state.filteredTasks.map((t) =>
              t.id === tempId ? task : t,
            ),
            isLoading: false,
          }));

          get().applyFilters();
          logger.info("Task created successfully:", { task });

          const createSource = consumePendingAnalytics("taskCreateSource");
          logger.info("Task created with source:", { createSource });
          track(AnalyticsEvents.TASK_CREATED, {
            source: createSource || "manual",
          });

          set({ lastFetched: new Date().toISOString() });

          if (task.dueDate) {
            try {
              // Import alarm store dynamically to avoid circular dependency
              const { useAlarmStore } = await import("./alarmStore");
              // Use setTimeout to delay refresh slightly, giving backend time to create alarm
              setTimeout(() => {
                // Fetch with high limit and enabled=true to get all enabled alarms including the new one
                useAlarmStore
                  .getState()
                  .fetchAlarms(1, 1000, true)
                  .catch((err) => {
                    logger.warn(
                      "Failed to refresh alarms after task creation:",
                      err,
                    );
                    // Don't throw - this is a background operation
                  });
              }, 1000); // Wait 1 second for backend to process
            } catch (error) {
              logger.warn(
                "Failed to refresh alarms after task creation:",
                error,
              );
              // Don't throw - alarm refresh failure shouldn't break task creation
            }
          }
        } catch (error: any) {
          logger.error("Create task error:", error);

          // Rollback optimistic update on error
          const updatedPendingOps = get().pendingOperations;
          updatedPendingOps.delete(tempId);
          set({ pendingOperations: updatedPendingOps });
          get().removeTask(tempId);

          trackFailure(AnalyticsEvents.TASK_CREATION_FAILED, error);
          set({
            error: error.message || "Failed to create task",
            isLoading: false,
          });
          throw error;
        }
      },

      updateTask: async (id: string, data: UpdateTaskData) => {
        try {
          set({ isLoading: true, error: null });

          const filteredData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined),
          ) as UpdateTaskData;

          const task = await taskService.updateTask(id, filteredData);
          // ✅ Refresh alarms if dueDate or dueTime was updated
          const shouldRefreshAlarms =
            data.dueDate !== undefined || data.dueTime !== undefined;
          if (shouldRefreshAlarms) {
            try {
              // Import alarm store dynamically to avoid circular dependency
              const { useAlarmStore } = await import("./alarmStore");
              // Use setTimeout to delay refresh slightly, giving backend time to update alarm
              setTimeout(() => {
                // Fetch with high limit and enabled=true to get all enabled alarms including the updated one
                useAlarmStore
                  .getState()
                  .fetchAlarms(1, 1000, true)
                  .catch((err) => {
                    logger.warn(
                      "Failed to refresh alarms after task update:",
                      err,
                    );
                    // Don't throw - this is a background operation
                  });
              }, 1000); // Wait 1 second for backend to process
            } catch (error) {
              logger.warn("Failed to refresh alarms after task update:", error);
              // Don't throw - alarm refresh failure shouldn't break task update
            }
          }

          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? task : t)),
            currentTask:
              state.currentTask?.id === id ? task : state.currentTask,
            isLoading: false,
          }));

          get().applyFilters();
          logger.info(
            " ********************************** Task Update before consumePendingAnalytics:",
          );

          track(AnalyticsEvents.TASK_UPDATED);
          const calendarAction = consumePendingAnalytics("calendarEventAction");
          logger.info("Update task calendar action:", { calendarAction });

          if (calendarAction === "updated") {
            track(AnalyticsEvents.CALENDAR_EVENT_UPDATED, { entity: "task" });
          }
        } catch (error: any) {
          logger.error("Update task error:", error);
          trackFailure(AnalyticsEvents.TASK_UPDATE_FAILED, error);
          set({
            error: error.message || "Failed to update task",
            isLoading: false,
          });
          throw error;
        }
      },

      deleteTask: async (id: string) => {
        try {
          set({ isLoading: true, error: null });

          await taskService.deleteTask(id);

          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            currentTask:
              state.currentTask?.id === id ? null : state.currentTask,
            isLoading: false,
          }));
          const { useAlarmStore } = require("./alarmStore");
          useAlarmStore
            .getState()
            .fetchAlarms(1, 1000, true)
            .catch(() => {});

          get().applyFilters();
          track(AnalyticsEvents.TASK_DELETED);
          const calendarAction = consumePendingAnalytics("calendarEventAction");
          if (calendarAction === "deleted") {
            track(AnalyticsEvents.CALENDAR_EVENT_DELETED, { entity: "task" });
          }
        } catch (error: any) {
          logger.error("Delete task error:", error);
          trackFailure(AnalyticsEvents.TASK_DELETE_FAILED, error);
          set({
            error: error.message || "Failed to delete task",
            isLoading: false,
          });
          throw error;
        }
      },

      completeTask: async (id: string) => {
        try {
          const task = await taskService.completeTask(id);

          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? task : t)),
            currentTask:
              state.currentTask?.id === id ? task : state.currentTask,
          }));

          get().applyFilters();
          const completeSource = consumePendingAnalytics("taskCompleteSource");
          track(AnalyticsEvents.TASK_COMPLETED, {
            source: completeSource || "task_list",
          });
          if (completeSource === "calendar") {
            track(AnalyticsEvents.CALENDAR_EVENT_UPDATED, {
              entity: "task",
              action: "completed",
            });
          }
        } catch (error: any) {
          logger.error("Complete task error:", error);
          throw error;
        }
      },

      uncompleteTask: async (id: string) => {
        try {
          const task = await taskService.uncompleteTask(id);

          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? task : t)),
            currentTask:
              state.currentTask?.id === id ? task : state.currentTask,
          }));

          get().applyFilters();
          const completeSource = consumePendingAnalytics("taskCompleteSource");
          track(AnalyticsEvents.TASK_UNCOMPLETED, {
            source: completeSource || "task_list",
          });
          if (completeSource === "calendar") {
            track(AnalyticsEvents.CALENDAR_EVENT_UPDATED, {
              entity: "task",
              action: "uncompleted",
            });
          }
        } catch (error: any) {
          logger.error("Uncomplete task error:", error);
          throw error;
        }
      },

      assignTask: async (id: string, assigneeId: string) => {
        try {
          const task = await taskService.assignTask(id, assigneeId);

          set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? task : t)),
            currentTask:
              state.currentTask?.id === id ? task : state.currentTask,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error("Assign task error:", error);
          throw error;
        }
      },

      reorderTasks: async (fromIndex: number, toIndex: number) => {
        try {
          set((state) => {
            const newTasks = [...state.tasks];
            const [movedTask] = newTasks.splice(fromIndex, 1);
            newTasks.splice(toIndex, 0, movedTask);
            return { tasks: newTasks };
          });

          get().applyFilters();
        } catch (error: any) {
          logger.error("Reorder tasks error:", error);
          throw error;
        }
      },

      updateTaskOrder: async (newTasks: Task[]) => {
        try {
          const tasksWithOrder = newTasks.map((task, index) => ({
            ...task,
            order: index,
          }));

          set(() => ({
            tasks: tasksWithOrder,
            filteredTasks: tasksWithOrder,
          }));

          await taskService.updateTaskOrder(
            tasksWithOrder.map((task, index) => ({
              id: task.id,
              order: index,
            })),
          );
        } catch (error: any) {
          logger.error("Update task order error:", error);
          throw error;
        }
      },

      // Filtering and searching
      setFilter: (filter: TaskFilter) => {
        set({ filter });
        get().applyFilters();
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        get().applyFilters();
      },

      setSortBy: (
        sortBy: "createdAt" | "dueDate" | "priority" | "title" | "order",
      ) => {
        set({ sortBy });
        get().applyFilters();
      },

      setSortOrder: (order: "asc" | "desc") => {
        set({ sortOrder: order });
        get().applyFilters();
      },

      resetToCustomOrder: () => {
        set({ sortBy: "order", sortOrder: "asc" });
        get().applyFilters();
      },

      clearFilters: () => {
        set({
          filter: {},
          searchQuery: "",
          sortBy: "order",
          sortOrder: "asc",
        });
        get().applyFilters();
        logger.info("Filters cleared - all tasks should be visible");
      },

      applyFilters: () => {
        const { tasks, filter, searchQuery, sortBy, sortOrder = "asc" } = get();

        let filtered = [...tasks];

        if (searchQuery) {
          filtered = filtered.filter(
            (task) =>
              task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              task.description
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()),
          );
        }

        if (filter.status && filter.status?.length > 0) {
          filtered = filtered.filter((task) =>
            filter.status!.includes(task.status),
          );
        }

        if (filter.priority && filter.priority?.length > 0) {
          filtered = filtered.filter((task) =>
            filter.priority!.includes(task.priority),
          );
        }

        if (filter.projectId) {
          filtered = filtered.filter(
            (task) => task.projectId === filter.projectId,
          );
        }

        if (filter.goalId !== undefined && filter.goalId !== null) {
          filtered = filtered.filter((task) => task.goalId === filter.goalId);
        }

        if (filter.assigneeId) {
          filtered = filtered.filter(
            (task) => task.assigneeId === filter.assigneeId,
          );
        }

        if (filter.dueDate) {
          filtered = filtered.filter((task) => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            const from = filter.dueDate!.from;
            const to = filter.dueDate!.to;

            if (from && taskDate < from) return false;
            if (to && taskDate > to) return false;
            return true;
          });
        }

        if (sortBy && sortBy !== "order") {
          filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortBy) {
              case "createdAt":
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
                break;
              case "dueDate":
                aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                break;
              case "priority":
                const priorityOrder = {
                  [TaskPriority.URGENT]: 4,
                  [TaskPriority.HIGH]: 3,
                  [TaskPriority.MEDIUM]: 2,
                  [TaskPriority.LOW]: 1,
                };
                aValue = priorityOrder[a.priority] || 0;
                bValue = priorityOrder[b.priority] || 0;
                break;
              case "title":
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
              default:
                return 0;
            }

            if (sortOrder === "asc") {
              return aValue > bValue ? 1 : -1;
            } else {
              return aValue < bValue ? 1 : -1;
            }
          });
        } else {
          filtered.sort((a, b) => {
            return (a.order || 0) - (b.order || 0);
          });
        }

        set({ filteredTasks: filtered });
      },

      // State management
      setCurrentTask: (task: Task | null) => set({ currentTask: task }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      // Local updates (optimistic updates)
      addTask: (task: Task) => {
        set((state) => ({
          tasks: [task, ...state.tasks],
        }));
        get().applyFilters();
      },

      updateTaskLocal: (id: string, data: Partial<Task>) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
          currentTask:
            state.currentTask?.id === id
              ? { ...state.currentTask, ...data }
              : state.currentTask,
        }));
        get().applyFilters();
      },

      reset: () => {
        set({
          tasks: [],
          filteredTasks: [],
          currentTask: null,
          isLoading: false,
          isLoaded: false,
          lastFetched: null,
          error: null,
          filter: {},
          searchQuery: "",
          sortBy: "order",
          sortOrder: "asc",
          pendingOperations: new Map(),
        });
      },

      removeTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          currentTask: state.currentTask?.id === id ? null : state.currentTask,
        }));
        get().applyFilters();
      },
    }),
    {
      name: "task-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        filter: state.filter,
        searchQuery: state.searchQuery,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        isLoaded: state.isLoaded,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);
