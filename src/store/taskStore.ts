import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { taskService } from '@/services/taskService';
import { Task, CreateTaskData, UpdateTaskData, TaskFilter, TaskPriority } from '@/types/task';
import { logger } from '@/utils/logger';
import { track, trackFailure, AnalyticsEvents } from '@/analytics/posthog';
import { consumePendingAnalytics } from '@/analytics/pendingContext';

interface TaskState {
  tasks: Task[];
  filteredTasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  error: string | null;
  filter: TaskFilter;
  searchQuery: string;
  sortBy: 'createdAt' | 'dueDate' | 'priority' | 'title' | 'order';
  sortOrder: 'asc' | 'desc';
}

interface TaskActions {
  // Data fetching
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
  }) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;

  // CRUD operations
  createTask: (data: CreateTaskData) => Promise<void>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Task actions
  completeTask: (id: string) => Promise<void>;
  uncompleteTask: (id: string) => Promise<void>;
  assignTask: (id: string, assigneeId: string) => Promise<void>;
  reorderTasks: (fromIndex: number, toIndex: number) => Promise<void>;
  updateTaskOrder: (newTasks: Task[]) => Promise<void>;

  // Filtering and searching
  setFilter: (filter: TaskFilter) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: 'createdAt' | 'dueDate' | 'priority' | 'title' | 'order') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  resetToCustomOrder: () => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // State management
  setCurrentTask: (task: Task | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Local updates (optimistic updates)
  addTask: (task: Task) => void;
  updateTaskLocal: (id: string, data: Partial<Task>) => void;
  removeTask: (id: string) => void;
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
      error: null,
      filter: {},
      searchQuery: '',
      sortBy: 'order',
      sortOrder: 'asc',

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
      }) => {
        try {
          set({ isLoading: true, error: null });

          // When fetching all tasks (no specific filter), use a high limit to get all tasks
          // This ensures regular tasks aren't hidden by pagination
          const { skipAlarmSync, ...fetchParams } = params ?? {};
          if (!params?.goalId && !params?.projectId && !params?.assigneeId && !params?.limit) {
            // Fetching all tasks - use a high limit (1000 should be enough for most users)
            fetchParams.limit = 1000;
            fetchParams.page = 1;
          }

          logger.info('Fetching tasks with params:', fetchParams);
          const response = await taskService.getTasks(fetchParams);
          const serverTasks = response;
          
          logger.info(`Fetched ${serverTasks.length} tasks from server`, {
            totalTasks: serverTasks.length,
            withGoalId: serverTasks.filter(t => t.goalId).length,
            withoutGoalId: serverTasks.filter(t => !t.goalId).length,
            withProjectId: serverTasks.filter(t => t.projectId).length,
            regularTasks: serverTasks.filter(t => !t.goalId && !t.projectId).length,
            taskIds: serverTasks.map(t => ({ id: t.id, title: t.title, goalId: t.goalId, projectId: t.projectId })).slice(0, 10),
          });

          // Sort tasks by order field
          const sortedServerTasks = serverTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

          // Merge with existing tasks to preserve optimistic updates
          // Server tasks take precedence, but keep local tasks that don't exist on server yet
          const currentTasks = get().tasks;
          const serverTaskIds = new Set(sortedServerTasks.map(t => t.id));

          if (params?.projectId || params?.goalId || params?.assigneeId) {
            // If fetching with a filter, update only tasks that match the filter
            // Keep tasks from other projects/goals/assignees intact
            const filterKey = params.projectId ? 'projectId' : params.goalId ? 'goalId' : 'assigneeId';
            const filterValue = params.projectId || params.goalId || params.assigneeId;

            // Remove existing tasks that match the filter (will be replaced by server tasks)
            const tasksFromOtherFilters = currentTasks.filter(task => task[filterKey] !== filterValue);

            // Find local tasks that match the filter but aren't on server (newly created)
            const localOnlyTasks = currentTasks.filter(task => {
              return task[filterKey] === filterValue && !serverTaskIds.has(task.id);
            });

            // Merge: tasks from other filters + server tasks + local-only tasks matching filter
            const mergedTasks = [...tasksFromOtherFilters, ...sortedServerTasks, ...localOnlyTasks];

            // Sort merged tasks by order
            const sortedMergedTasks = mergedTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

            set({
              tasks: sortedMergedTasks,
              filteredTasks: sortedMergedTasks,
              isLoading: false,
            });
          } else {
            // No filter: server tasks are the source of truth for user's tasks
            // IMPORTANT: Replace ALL tasks with server tasks when fetching all tasks
            // This ensures we have the complete list from the server
            logger.info(`Fetching ALL tasks (no filter) - replacing ${currentTasks.length} existing tasks with ${sortedServerTasks.length} server tasks`, {
              regularTasksInStore: currentTasks.filter(t => !t.goalId && !t.projectId).length,
              regularTasksFromServer: sortedServerTasks.filter(t => !t.goalId && !t.projectId).length,
            });
            
            set({
              tasks: sortedServerTasks,
              filteredTasks: sortedServerTasks,
              isLoading: false,
            });
          }

          // Apply current filters
          get().applyFilters();
          
          // Fetch and schedule alarms after tasks are loaded (so task alarms are scheduled)
          if (!skipAlarmSync) {
            try {
              const { useAlarmStore } = require('./alarmStore');
              useAlarmStore.getState().fetchAlarms(1, 100, true).catch((error: any) => {
                logger.error('Failed to fetch alarms after tasks loaded:', error);
              });
            } catch (error) {
              // Ignore if alarmStore is not available
            }
          }
        } catch (error: any) {
          logger.error('Fetch tasks error:', error);
          set({
            error: error.message || 'Failed to fetch tasks',
            isLoading: false,
          });
        }
      },

      fetchTask: async (id: string) => {
        try {
          set({ isLoading: true, error: null });

          const task = await taskService.getTask(id);

          set({
            currentTask: task,
            isLoading: false,
          });
        } catch (error: any) {
          logger.error('Fetch task error:', error);
          set({
            error: error.message || 'Failed to fetch task',
            isLoading: false,
          });
        }
      },

      refreshTasks: async () => {
        await get().fetchTasks();
      },

      // CRUD operations
      createTask: async (data: CreateTaskData) => {
        try {
          set({ isLoading: true, error: null });

          // Filter out undefined values before sending to backend, but always include description
          const filteredData = Object.fromEntries(
            Object.entries(data).filter(([key, value]) => {
              // Always include description (even if empty string)
              if (key === 'description') return true;
              return value !== undefined;
            })
          ) as CreateTaskData;

          // Ensure description is always a string (empty string if not provided)
          filteredData.description = filteredData.description ?? '';

          const task = await taskService.createTask(filteredData);

          // NOTE: Alarm creation is handled by the backend in scheduleTaskDueDateNotifications
          // which creates an alarm with linkedTaskId. Frontend should not create duplicate alarms.
          // The backend will create an alarm with title "Task Due: {taskTitle}" when dueDate and dueTime are provided.

          set((state) => {
            const tasks = [task, ...state.tasks];
            return {
              tasks,
              filteredTasks: tasks,
              isLoading: false,
            };
          });

          get().applyFilters();

          const createSource = consumePendingAnalytics('taskCreateSource');
          track(AnalyticsEvents.TASK_CREATED, { source: createSource || 'manual' });
          if (createSource === 'calendar') {
            track(AnalyticsEvents.CALENDAR_EVENT_CREATED, { entity: 'task' });
          }

          // Refresh alarms after task creation if task has dueDate
          // This ensures newly created alarms from the backend are fetched
          if (task.dueDate) {
            try {
              // Import alarm store dynamically to avoid circular dependency
              const { useAlarmStore } = await import('./alarmStore');
              // Use setTimeout to delay refresh slightly, giving backend time to create alarm
              setTimeout(() => {
                // Fetch with high limit and enabled=true to get all enabled alarms including the new one
                useAlarmStore.getState().fetchAlarms(1, 1000, true).catch(err => {
                  logger.warn('Failed to refresh alarms after task creation:', err);
                  // Don't throw - this is a background operation
                });
              }, 1000); // Wait 1 second for backend to process
            } catch (error) {
              logger.warn('Failed to refresh alarms after task creation:', error);
              // Don't throw - alarm refresh failure shouldn't break task creation
            }
          }
        } catch (error: any) {
          logger.error('Create task error:', error);
          trackFailure(AnalyticsEvents.TASK_CREATION_FAILED, error);
          set({
            error: error.message || 'Failed to create task',
            isLoading: false,
          });
          throw error;
        }
      },

      updateTask: async (id: string, data: UpdateTaskData) => {
        try {
          set({ isLoading: true, error: null });

          // Filter out undefined values before sending to backend
          const filteredData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
          ) as UpdateTaskData;

          const task = await taskService.updateTask(id, filteredData);

          // NOTE: Alarm updates are handled by the backend in scheduleTaskDueDateNotifications
          // which automatically deletes existing alarms for the task and creates new ones when
          // dueDate or dueTime changes. Frontend should not create duplicate alarms.

          // Refresh alarms if dueDate or dueTime was updated
          const shouldRefreshAlarms = data.dueDate !== undefined || data.dueTime !== undefined;
          if (shouldRefreshAlarms) {
            try {
              // Import alarm store dynamically to avoid circular dependency
              const { useAlarmStore } = await import('./alarmStore');
              // Use setTimeout to delay refresh slightly, giving backend time to update alarm
              setTimeout(() => {
                // Fetch with high limit and enabled=true to get all enabled alarms including the updated one
                useAlarmStore.getState().fetchAlarms(1, 1000, true).catch(err => {
                  logger.warn('Failed to refresh alarms after task update:', err);
                  // Don't throw - this is a background operation
                });
              }, 1000); // Wait 1 second for backend to process
            } catch (error) {
              logger.warn('Failed to refresh alarms after task update:', error);
              // Don't throw - alarm refresh failure shouldn't break task update
            }
          }

          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? task : t),
            currentTask: state.currentTask?.id === id ? task : state.currentTask,
            isLoading: false,
          }));

          // Apply current filters
          get().applyFilters();
          track(AnalyticsEvents.TASK_UPDATED);
          const calendarAction = consumePendingAnalytics('calendarEventAction');
          if (calendarAction === 'updated') {
            track(AnalyticsEvents.CALENDAR_EVENT_UPDATED, { entity: 'task' });
          }
        } catch (error: any) {
          logger.error('Update task error:', error);
          trackFailure(AnalyticsEvents.TASK_UPDATE_FAILED, error);
          set({
            error: error.message || 'Failed to update task',
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
            tasks: state.tasks.filter(t => t.id !== id),
            currentTask: state.currentTask?.id === id ? null : state.currentTask,
            isLoading: false,
          }));

          // Apply current filters
          get().applyFilters();
          track(AnalyticsEvents.TASK_DELETED);
          const calendarAction = consumePendingAnalytics('calendarEventAction');
          if (calendarAction === 'deleted') {
            track(AnalyticsEvents.CALENDAR_EVENT_DELETED, { entity: 'task' });
          }
        } catch (error: any) {
          logger.error('Delete task error:', error);
          trackFailure(AnalyticsEvents.TASK_DELETE_FAILED, error);
          set({
            error: error.message || 'Failed to delete task',
            isLoading: false,
          });
          throw error;
        }
      },

      // Task actions
      completeTask: async (id: string) => {
        try {
          const task = await taskService.completeTask(id);

          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? task : t),
            currentTask: state.currentTask?.id === id ? task : state.currentTask,
          }));

          // Apply current filters
          get().applyFilters();
          const completeSource = consumePendingAnalytics('taskCompleteSource');
          track(AnalyticsEvents.TASK_COMPLETED, { source: completeSource || 'task_list' });
          if (completeSource === 'calendar') {
            track(AnalyticsEvents.CALENDAR_EVENT_UPDATED, { entity: 'task', action: 'completed' });
          }
        } catch (error: any) {
          logger.error('Complete task error:', error);
          throw error;
        }
      },

      uncompleteTask: async (id: string) => {
        try {
          const task = await taskService.uncompleteTask(id);

          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? task : t),
            currentTask: state.currentTask?.id === id ? task : state.currentTask,
          }));

          // Apply current filters
          get().applyFilters();
          const completeSource = consumePendingAnalytics('taskCompleteSource');
          track(AnalyticsEvents.TASK_UNCOMPLETED, { source: completeSource || 'task_list' });
          if (completeSource === 'calendar') {
            track(AnalyticsEvents.CALENDAR_EVENT_UPDATED, { entity: 'task', action: 'uncompleted' });
          }
        } catch (error: any) {
          logger.error('Uncomplete task error:', error);
          throw error;
        }
      },

      assignTask: async (id: string, assigneeId: string) => {
        try {
          const task = await taskService.assignTask(id, assigneeId);

          set((state) => ({
            tasks: state.tasks.map(t => t.id === id ? task : t),
            currentTask: state.currentTask?.id === id ? task : state.currentTask,
          }));

          // Apply current filters
          get().applyFilters();
        } catch (error: any) {
          logger.error('Assign task error:', error);
          throw error;
        }
      },

      reorderTasks: async (fromIndex: number, toIndex: number) => {
        try {
          set((state) => {
            const newTasks = [...state.tasks];
            const [movedTask] = newTasks.splice(fromIndex, 1);
            newTasks.splice(toIndex, 0, movedTask);

            return {
              tasks: newTasks,
            };
          });

          // Apply current filters to update filteredTasks
          get().applyFilters();

          // Save the new order to backend (optional - you can implement this in taskService)
          // await taskService.updateTaskOrder(get().tasks.map((task, index) => ({ id: task.id, order: index })));
        } catch (error: any) {
          logger.error('Reorder tasks error:', error);
          throw error;
        }
      },

      updateTaskOrder: async (newTasks: Task[]) => {
        try {
          // Update tasks with new order values
          const tasksWithOrder = newTasks.map((task, index) => ({
            ...task,
            order: index
          }));

          set(() => ({
            tasks: tasksWithOrder,
            filteredTasks: tasksWithOrder, // Update filtered tasks directly to preserve order
          }));

          // Save the new order to backend
          await taskService.updateTaskOrder(tasksWithOrder.map((task, index) => ({ id: task.id, order: index })));
        } catch (error: any) {
          logger.error('Update task order error:', error);
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

      setSortBy: (sortBy: 'createdAt' | 'dueDate' | 'priority' | 'title' | 'order') => {
        set({ sortBy });
        get().applyFilters();
      },

      setSortOrder: (order: 'asc' | 'desc') => {
        set({ sortOrder: order });
        get().applyFilters();
      },

      resetToCustomOrder: () => {
        set({ sortBy: 'order', sortOrder: 'asc' });
        get().applyFilters();
      },

      clearFilters: () => {
        const clearedFilter = {};
        set({
          filter: clearedFilter,
          searchQuery: '',
          sortBy: 'order',
          sortOrder: 'asc',
        });
        // Force re-apply filters with empty filter to ensure all tasks are shown
        get().applyFilters();
        logger.info('Filters cleared - all tasks should be visible');
      },

      // Apply filters to tasks
      applyFilters: () => {
        const { tasks, filter, searchQuery, sortBy, sortOrder = "asc" } = get();

        logger.info('Applying filters:', {
          totalTasks: tasks.length,
          filter,
          searchQuery,
          sortBy,
          sortOrder,
          regularTasks: tasks.filter(t => !t.goalId && !t.projectId).length,
          goalTasks: tasks.filter(t => t.goalId).length,
          projectTasks: tasks.filter(t => t.projectId).length,
        });

        let filtered = [...tasks];

        // Apply search filter
        if (searchQuery) {
          filtered = filtered.filter(task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Apply status filter
        if (filter.status && filter.status?.length > 0) {
          filtered = filtered.filter(task => filter.status!.includes(task.status));
        }

        // Apply priority filter
        if (filter.priority && filter.priority?.length > 0) {
          filtered = filtered.filter(task => filter.priority!.includes(task.priority));
        }

        // Apply project filter
        if (filter.projectId) {
          filtered = filtered.filter(task => task.projectId === filter.projectId);
        }

        // Apply goal filter - only if goalId is explicitly set (not null/undefined)
        // Note: goalId can be null for regular tasks, so we need to check for explicit value
        // IMPORTANT: Do NOT filter out tasks without goalId - they are regular tasks!
        if (filter.goalId !== undefined && filter.goalId !== null) {
          filtered = filtered.filter(task => task.goalId === filter.goalId);
          logger.info(`Filtered by goalId ${filter.goalId}: ${filtered.length} tasks`);
        } else {
          // No goalId filter - include ALL tasks (regular tasks, goal tasks, project tasks)
          logger.info(`No goalId filter - keeping all ${filtered.length} tasks`);
        }

        // Apply assignee filter
        if (filter.assigneeId) {
          filtered = filtered.filter(task => task.assigneeId === filter.assigneeId);
        }

        // Apply due date filter
        if (filter.dueDate) {
          filtered = filtered.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            const from = filter.dueDate!.from;
            const to = filter.dueDate!.to;

            if (from && taskDate < from) return false;
            if (to && taskDate > to) return false;
            return true;
          });
        }

        // Apply sorting - but preserve custom order if no specific sort is applied
        if (sortBy && sortBy !== 'order') {
          filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortBy) {
              case 'createdAt':
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
                break;
              case 'dueDate':
                aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                break;
              case 'priority':
                const priorityOrder = { [TaskPriority.URGENT]: 4, [TaskPriority.HIGH]: 3, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 1 };
                aValue = priorityOrder[a.priority] || 0;
                bValue = priorityOrder[b.priority] || 0;
                break;
              case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
              default:
                return 0;
            }

            if (sortOrder === 'asc') {
              return aValue > bValue ? 1 : -1;
            } else {
              return aValue < bValue ? 1 : -1;
            }
          });
        } else {
          // Default sorting by order field (preserves drag & drop order)
          filtered.sort((a, b) => {
            return (a.order || 0) - (b.order || 0);
          });
        }

        logger.info('Final filtered tasks after applying all filters:', {
          totalFiltered: filtered.length,
          regularTasks: filtered.filter(t => !t.goalId && !t.projectId).length,
          goalTasks: filtered.filter(t => t.goalId).length,
          projectTasks: filtered.filter(t => t.projectId).length,
        });

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
          tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t),
          currentTask: state.currentTask?.id === id ? { ...state.currentTask, ...data } : state.currentTask,
        }));
        get().applyFilters();
      },

      removeTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter(t => t.id !== id),
          currentTask: state.currentTask?.id === id ? null : state.currentTask,
        }));
        get().applyFilters();
      },
    }),
    {
      name: 'task-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        filter: state.filter,
        searchQuery: state.searchQuery,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
