import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goalService } from '@/services/goalService';
import { Goal, CreateGoalData, UpdateGoalData, GoalStatus, GoalPriority, AIPlanRequest } from '@/types/goal';
import { CreateGoalMilestoneData, MilestoneStatus, UpdateGoalMilestoneData } from '@/types';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { track, trackFailure, AnalyticsEvents } from '@/analytics/posthog';
import { consumePendingAnalytics } from '@/analytics/pendingContext';
import { useAuthStore } from './authStore';
import { useTaskStore } from './taskStore';

function calculateProgressFromMilestones(goal: Goal, milestones: Goal['milestones']): number {
  if (milestones.length === 0) return goal.progress;
  const completedMilestones = milestones.filter((m) => m.status === MilestoneStatus.DONE).length;
  return Math.round((completedMilestones / milestones.length) * 100);
}

function withMilestones(goal: Goal, milestones: Goal['milestones']): Goal {
  return {
    ...goal,
    milestones,
    progress: calculateProgressFromMilestones(goal, milestones),
    updatedAt: new Date().toISOString(),
  };
}

function syncTasksIntoTaskStore(tasks: Goal['tasks']): void {
  if (tasks.length === 0) return;
  const taskStore = useTaskStore.getState();
  const existingTasks = taskStore.tasks;
  const incomingById = new Map(tasks.map((task) => [task.id, task]));
  useTaskStore.setState({
    tasks: [
      ...tasks.filter((task) => !existingTasks.some((existing) => existing.id === task.id)),
      ...existingTasks.map((task) => incomingById.get(task.id) ?? task),
    ],
  });
  taskStore.applyFilters();
}

interface GoalState {
  goals: Goal[];
  filteredGoals: Goal[];
  currentGoal: Goal | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: GoalStatus[];
  priorityFilter: GoalPriority[];
  categoryFilter: string[];
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'targetDate' | 'progress' | 'priority';
  sortOrder: 'asc' | 'desc';

  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface GoalActions {
  // Data fetching
  fetchGoals: (page?: number, limit?: number) => Promise<void>;
  fetchGoal: (id: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
  loadMoreGoals: () => Promise<void>;

  // CRUD operations
  createGoal: (data: CreateGoalData) => Promise<void>;
  updateGoal: (id: string, data: UpdateGoalData) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Goal actions
  completeGoal: (id: string) => Promise<void>;
  pauseGoal: (id: string) => Promise<void>;
  resumeGoal: (id: string) => Promise<void>;
  cancelGoal: (id: string) => Promise<void>;

  // Milestone management
  createMilestone: (goalId: string, data: CreateGoalMilestoneData) => Promise<void>;
  updateMilestone: (goalId: string, milestoneId: string, data: UpdateGoalMilestoneData) => Promise<void>;
  deleteMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  completeMilestone: (goalId: string, milestoneId: string) => Promise<void>;

  // AI Planning
  generateAIPlan: (goalId: string, promptOptions?: AIPlanRequest['promptOptions']) => Promise<Goal>;

  // Analytics
  getGoalAnalytics: (goalId: string, timeRange?: string) => Promise<any>;
  generateProgressHistory: (goal: any, timeRange: string) => any[];

  // Filtering and searching
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: GoalStatus[]) => void;
  setPriorityFilter: (priority: GoalPriority[]) => void;
  setCategoryFilter: (category: string[]) => void;
  setSortBy: (sortBy: 'createdAt' | 'updatedAt' | 'title' | 'targetDate' | 'progress' | 'priority') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  clearFilters: () => void;
  applyFilters: () => void;

  // State management
  setCurrentGoal: (goal: Goal | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Local updates (optimistic updates)
  addGoal: (goal: Goal) => void;
  updateGoalLocal: (id: string, data: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
}

type GoalStore = GoalState & GoalActions;

export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      // State
      goals: [],
      filteredGoals: [],
      currentGoal: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      statusFilter: [],
      priorityFilter: [],
      categoryFilter: [],
      sortBy: 'createdAt',
      sortOrder: 'desc',

      // Pagination
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 20,
      hasNextPage: false,
      hasPreviousPage: false,

      // Data fetching
      fetchGoals: async (page = 1, limit = 20) => {
        try {
          if (!useAuthStore.getState().isAuthenticated) {
            set({ isLoading: false, error: null });
            return;
          }

          set({ isLoading: true, error: null });

          const response = await goalService.getGoals({
            page,
            limit,
            search: get().searchQuery,
            status: get().statusFilter.length > 0 ? get().statusFilter.join(',') : undefined,
          });

          const goals = response.data || [];
          const pagination = response.pagination ?? {
            page,
            limit,
            total: goals.length,
            totalPages: page,
          };

          set({
            goals: page === 1 ? goals : [...get().goals, ...goals],
            filteredGoals: page === 1 ? goals : [...get().filteredGoals, ...goals],
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalItems: pagination.total,
            itemsPerPage: pagination.limit,
            hasNextPage: pagination.page < pagination.totalPages,
            hasPreviousPage: pagination.page > 1,
            isLoading: false,
          });

          // Apply current filters
          get().applyFilters();
        } catch (error: any) {
          logger.error('Fetch goals error:', error);
          set({
            error: error.message || 'Failed to fetch goals',
            isLoading: false,
          });
        }
      },

      fetchGoal: async (id: string) => {
        try {
          if (!useAuthStore.getState().isAuthenticated) {
            set({ isLoading: false, error: null });
            return;
          }

          set({ isLoading: true, error: null });

          const goal = await goalService.getGoal(id);

          // Update the goal in the goals list if it exists there
          set((state) => ({
            currentGoal: goal,
            goals: state.goals.map(g => g.id === id ? goal : g),
            filteredGoals: state.filteredGoals.map(g => g.id === id ? goal : g),
            isLoading: false,
          }));
        } catch (error: any) {
          logger.error('Fetch goal error:', error);
          set({
            error: error.message || 'Failed to fetch goal',
            isLoading: false,
          });
        }
      },

      refreshGoals: async () => {
        await get().fetchGoals(1, get().itemsPerPage);
      },

      loadMoreGoals: async () => {
        const { currentPage, hasNextPage, isLoading } = get();
        if (hasNextPage && !isLoading) {
          await get().fetchGoals(currentPage + 1, get().itemsPerPage);
        }
      },

      // CRUD operations
      createGoal: async (data: CreateGoalData) => {
        try {
          set({ isLoading: true, error: null });

          const goal = await goalService.createGoal(data);

          set((state) => ({
            goals: [goal, ...state.goals],
            isLoading: false,
          }));

          // Apply current filters
          get().applyFilters();
          const createSource = consumePendingAnalytics('goalCreateSource');
          track(AnalyticsEvents.GOAL_CREATED, { source: createSource || 'manual' });
          if (createSource === 'calendar') {
            track(AnalyticsEvents.CALENDAR_EVENT_CREATED, { entity: 'goal' });
          }
        } catch (error: any) {
          logger.error('Create goal error:', error);
          trackFailure(AnalyticsEvents.GOAL_CREATION_FAILED, error);
          set({
            error: error.message || 'Failed to create goal',
            isLoading: false,
          });
          throw error;
        }
      },

      updateGoal: async (id: string, data: UpdateGoalData) => {
        try {
          set({ isLoading: true, error: null });

          const goal = await goalService.updateGoal(id, data);

          set((state) => ({
            goals: state.goals.map(g => g.id === id ? goal : g),
            currentGoal: state.currentGoal?.id === id ? goal : state.currentGoal,
            isLoading: false,
          }));

          // Apply current filters
          get().applyFilters();
          track(AnalyticsEvents.GOAL_UPDATED);
        } catch (error: any) {
          logger.error('Update goal error:', error);
          trackFailure(AnalyticsEvents.GOAL_UPDATE_FAILED, error);
          set({
            error: error.message || 'Failed to update goal',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteGoal: async (id: string) => {
        try {
          set({ isLoading: true, error: null });

          await goalService.deleteGoal(id);

          set((state) => ({
            goals: state.goals.filter(g => g.id !== id),
            currentGoal: state.currentGoal?.id === id ? null : state.currentGoal,
            isLoading: false,
          }));

          // Apply current filters
          get().applyFilters();
          track(AnalyticsEvents.GOAL_DELETED);
        } catch (error: any) {
          logger.error('Delete goal error:', error);
          trackFailure(AnalyticsEvents.GOAL_DELETE_FAILED, error);
          set({
            error: error.message || 'Failed to delete goal',
            isLoading: false,
          });
          throw error;
        }
      },

      // Goal actions
      completeGoal: async (id: string) => {
        try {
          const goal = await goalService.updateGoal(id, {
            status: GoalStatus.DONE,
            progress: 100,
            completedAt: new Date().toISOString()
          });

          set((state) => ({
            goals: state.goals.map(g => g.id === id ? goal : g),
            currentGoal: state.currentGoal?.id === id ? goal : state.currentGoal,
          }));

          get().applyFilters();
          track(AnalyticsEvents.GOAL_COMPLETED);
        } catch (error: any) {
          logger.error('Complete goal error:', error);
          throw error;
        }
      },

      pauseGoal: async (id: string) => {
        try {
          const goal = await goalService.updateGoal(id, { status: GoalStatus.PAUSED });

          set((state) => ({
            goals: state.goals.map(g => g.id === id ? goal : g),
            currentGoal: state.currentGoal?.id === id ? goal : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Pause goal error:', error);
          throw error;
        }
      },

      resumeGoal: async (id: string) => {
        try {
          const goal = await goalService.updateGoal(id, { status: GoalStatus.ACTIVE });

          set((state) => ({
            goals: state.goals.map(g => g.id === id ? goal : g),
            currentGoal: state.currentGoal?.id === id ? goal : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Resume goal error:', error);
          throw error;
        }
      },

      cancelGoal: async (id: string) => {
        try {
          const goal = await goalService.updateGoal(id, { status: GoalStatus.CANCELLED });

          set((state) => ({
            goals: state.goals.map(g => g.id === id ? goal : g),
            currentGoal: state.currentGoal?.id === id ? goal : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Cancel goal error:', error);
          throw error;
        }
      },

      // Milestone management
      createMilestone: async (goalId: string, data: CreateGoalMilestoneData) => {
        try {
          const milestone = await goalService.createMilestone(goalId, data);

          set((state) => ({
            goals: state.goals.map(g =>
              g.id === goalId ? withMilestones(g, [...g.milestones, milestone]) : g
            ),
            currentGoal: state.currentGoal?.id === goalId
              ? withMilestones(state.currentGoal, [...state.currentGoal.milestones, milestone])
              : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Create milestone error:', error);
          throw error;
        }
      },

      updateMilestone: async (goalId: string, milestoneId: string, data: UpdateGoalMilestoneData) => {
        try {
          const milestone = await goalService.updateMilestone(goalId, milestoneId, data);

          set((state) => ({
            goals: state.goals.map(g =>
              g.id === goalId
                ? withMilestones(g, g.milestones.map(m => m.id === milestoneId ? milestone : m))
                : g
            ),
            currentGoal: state.currentGoal?.id === goalId
              ? withMilestones(
                  state.currentGoal,
                  state.currentGoal.milestones.map(m => m.id === milestoneId ? milestone : m)
                )
              : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Update milestone error:', error);
          throw error;
        }
      },

      deleteMilestone: async (goalId: string, milestoneId: string) => {
        try {
          await goalService.deleteMilestone(goalId, milestoneId);

          set((state) => ({
            goals: state.goals.map(g =>
              g.id === goalId ? withMilestones(g, g.milestones.filter(m => m.id !== milestoneId)) : g
            ),
            currentGoal: state.currentGoal?.id === goalId
              ? withMilestones(state.currentGoal, state.currentGoal.milestones.filter(m => m.id !== milestoneId))
              : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Delete milestone error:', error);
          throw error;
        }
      },

      completeMilestone: async (goalId: string, milestoneId: string) => {
        try {
          const milestone = await goalService.completeMilestone(goalId, milestoneId);

          set((state) => ({
            goals: state.goals.map(g =>
              g.id === goalId
                ? withMilestones(g, g.milestones.map(m => m.id === milestoneId ? milestone : m))
                : g
            ),
            currentGoal: state.currentGoal?.id === goalId
              ? withMilestones(
                  state.currentGoal,
                  state.currentGoal.milestones.map(m => m.id === milestoneId ? milestone : m)
                )
              : state.currentGoal,
          }));

          get().applyFilters();
        } catch (error: any) {
          logger.error('Complete milestone error:', error);
          throw error;
        }
      },

      // Filtering and searching
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        get().applyFilters();
      },

      setStatusFilter: (status: GoalStatus[]) => {
        set({ statusFilter: status });
        get().applyFilters();
      },

      setPriorityFilter: (priority: GoalPriority[]) => {
        set({ priorityFilter: priority });
        get().applyFilters();
      },

      setCategoryFilter: (category: string[]) => {
        set({ categoryFilter: category });
        get().applyFilters();
      },

      setSortBy: (sortBy: 'createdAt' | 'updatedAt' | 'title' | 'targetDate' | 'progress' | 'priority') => {
        set({ sortBy });
        get().applyFilters();
      },

      setSortOrder: (order: 'asc' | 'desc') => {
        set({ sortOrder: order });
        get().applyFilters();
      },

      clearFilters: () => {
        set({
          searchQuery: '',
          statusFilter: [],
          priorityFilter: [],
          categoryFilter: [],
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        get().applyFilters();
      },

      // Apply filters to goals
      applyFilters: () => {
        const { goals, searchQuery, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder = "desc" } = get();

        let filtered = [...goals];

        // Apply search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(goal =>
            goal.title.toLowerCase().includes(query) ||
            (goal.description && goal.description.toLowerCase().includes(query)) ||
            goal.category.toLowerCase().includes(query)
          );
        }

        // Apply status filter
        if (statusFilter.length > 0) {
          filtered = filtered.filter(goal => statusFilter.includes(goal.status));
        }

        // Apply priority filter
        if (priorityFilter.length > 0) {
          filtered = filtered.filter(goal => priorityFilter.includes(goal.priority));
        }

        // Apply category filter
        if (categoryFilter.length > 0) {
          filtered = filtered.filter(goal => categoryFilter.includes(goal.category));
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (sortBy) {
            case 'title':
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
              break;
            case 'createdAt':
              aValue = new Date(a.createdAt).getTime();
              bValue = new Date(b.createdAt).getTime();
              break;
            case 'updatedAt':
              aValue = new Date(a.updatedAt).getTime();
              bValue = new Date(b.updatedAt).getTime();
              break;
            case 'targetDate':
              aValue = a.targetDate ? new Date(a.targetDate).getTime() : 0;
              bValue = b.targetDate ? new Date(b.targetDate).getTime() : 0;
              break;
            case 'progress':
              aValue = a.progress;
              bValue = b.progress;
              break;
            case 'priority':
              const priorityOrder = { [GoalPriority.URGENT]: 4, [GoalPriority.HIGH]: 3, [GoalPriority.MEDIUM]: 2, [GoalPriority.LOW]: 1 };
              aValue = priorityOrder[a.priority] || 0;
              bValue = priorityOrder[b.priority] || 0;
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

        set({ filteredGoals: filtered });
      },

      // State management
      setCurrentGoal: (goal: Goal | null) => set({ currentGoal: goal }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      // Local updates (optimistic updates)
      addGoal: (goal: Goal) => {
        set((state) => ({
          goals: [goal, ...state.goals],
        }));
        get().applyFilters();
      },

      updateGoalLocal: (id: string, data: Partial<Goal>) => {
        set((state) => ({
          goals: state.goals.map(g => g.id === id ? { ...g, ...data } : g),
          currentGoal: state.currentGoal?.id === id ? { ...state.currentGoal, ...data } : state.currentGoal,
        }));
        get().applyFilters();
      },

      removeGoal: (id: string) => {
        set((state) => ({
          goals: state.goals.filter(g => g.id !== id),
          currentGoal: state.currentGoal?.id === id ? null : state.currentGoal,
        }));
        get().applyFilters();
      },

      updateGoalProgress: (id: string, progress: number) => {
        set((state) => ({
          goals: state.goals.map(g => g.id === id ? { ...g, progress, updatedAt: new Date().toISOString() } : g),
          currentGoal: state.currentGoal?.id === id ? { ...state.currentGoal, progress, updatedAt: new Date().toISOString() } : state.currentGoal,
        }));
        get().applyFilters();
      },

      // AI Planning
      generateAIPlan: async (goalId: string, promptOptions?: AIPlanRequest['promptOptions']) => {
        const startedAt = Date.now();
        try {
          set({ isLoading: true, error: null });
          track(AnalyticsEvents.AI_REQUEST_STARTED, { goalId });

          const result = await goalService.generateAIPlan({ goalId, promptOptions });
          const baseGoal = get().currentGoal?.id === goalId
            ? get().currentGoal
            : get().goals.find((goal) => goal.id === goalId);

          if (!baseGoal) {
            throw new Error('Goal not loaded');
          }

          const updatedGoal = withMilestones(
            {
              ...baseGoal,
              tasks: result.tasks,
            },
            result.milestones
          );

          syncTasksIntoTaskStore(result.tasks);

          const updateGoalInList = (goals: Goal[]) =>
            goals.map(g => (g.id === goalId ? updatedGoal : g));

          set((state) => ({
            goals: updateGoalInList(state.goals),
            filteredGoals: updateGoalInList(state.filteredGoals),
            currentGoal: state.currentGoal?.id === goalId ? updatedGoal : state.currentGoal,
            isLoading: false,
          }));

          get().applyFilters();

          const durationMs = Date.now() - startedAt;
          const tasksCount = result.tasks?.length ?? 0;
          const milestonesCount = result.milestones?.length ?? 0;
          track(AnalyticsEvents.AI_PLAN_GENERATED, { goalId, durationMs, tasksCount, milestonesCount });
          track(AnalyticsEvents.PLAN_SAVED, { goalId, durationMs });
          if (tasksCount > 0) {
            track(AnalyticsEvents.TASKS_GENERATED, { goalId, count: tasksCount });
          }
          if ('usedOfflineTemplate' in result && Boolean((result as { usedOfflineTemplate?: boolean }).usedOfflineTemplate)) {
            track(AnalyticsEvents.OFFLINE_TEMPLATE_USED, { goalId });
          }

          return updatedGoal;
        } catch (error: any) {
          logger.error('Generate AI plan error:', error);
          trackFailure(AnalyticsEvents.AI_PLAN_FAILED, error, { goalId });
          set({ error: error.message || 'Failed to generate AI plan', isLoading: false });
          throw error;
        }
      },

      // Helper function to generate progress history
      generateProgressHistory: (goal: any, timeRange: string) => {
        const now = new Date();
        const milestones = goal.milestones || [];

        // Determine the time period and intervals
        let startDate = new Date();
        let intervalDays = 1;
        let labelFormat = 'MMM dd';

        switch (timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            intervalDays = 1;
            labelFormat = 'EEE';
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            intervalDays = 2;
            labelFormat = 'MMM dd';
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            intervalDays = 7;
            labelFormat = 'MMM dd';
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            intervalDays = 30;
            labelFormat = 'MMM';
            break;
          default: // 'all'
            if (milestones.length > 0) {
              const earliestMilestone = milestones.reduce((earliest: any, current: any) =>
                new Date(current.createdAt) < new Date(earliest.createdAt) ? current : earliest
              );
              startDate = new Date(earliestMilestone.createdAt);
            } else {
              startDate.setMonth(now.getMonth() - 1);
            }
            intervalDays = 7;
            labelFormat = 'MMM dd';
        }

        // Generate time points
        const timePoints = [];
        const currentDate = new Date(startDate);

        while (currentDate <= now) {
          timePoints.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + intervalDays);
        }

        // Calculate progress at each time point
        const progressHistory = [];

        for (let i = 0; i < timePoints.length; i++) {
          const timePoint = timePoints[i];
          const label = format(timePoint, labelFormat);

          // Count milestones created before this time point
          const totalMilestonesAtTime = milestones.filter((milestone: any) =>
            new Date(milestone.createdAt) <= timePoint
          ).length;

          // Count milestones completed before this time point
          const completedMilestonesAtTime = milestones.filter((milestone: any) =>
            milestone.status === MilestoneStatus.DONE &&
            milestone.completedAt &&
            new Date(milestone.completedAt) <= timePoint
          ).length;

          // Calculate progress percentage
          let progressAtTime = 0;
          if (totalMilestonesAtTime > 0) {
            progressAtTime = Math.round((completedMilestonesAtTime / totalMilestonesAtTime) * 100);
          } else if (milestones.length > 0) {
            // If no milestones created yet at this time point, show 0
            progressAtTime = 0;
          } else {
            // If no milestones at all, create a gradual progression for demo
            const totalDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const daysPassed = Math.ceil((timePoint.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            progressAtTime = Math.min(Math.round((daysPassed / totalDays) * 100), 100);
          }

          // Add some realistic variation to prevent flat lines
          if (progressAtTime > 0 && i > 0) {
            const previousProgress = progressHistory[i - 1]?.progress || 0;
            // Ensure progress doesn't go backwards unless there's a real reason
            if (progressAtTime < previousProgress) {
              progressAtTime = previousProgress;
            }
          }

          progressHistory.push({
            week: label,
            progress: progressAtTime,
            date: timePoint,
            totalMilestones: totalMilestonesAtTime,
            completedMilestones: completedMilestonesAtTime
          });
        }
        return progressHistory;
      },

      // Analytics
      getGoalAnalytics: async (goalId: string, timeRange?: string) => {
        try {
          set({ isLoading: true, error: null });

          const goal = get().goals.find(g => g.id === goalId);
          if (!goal) return null;

          // Filter milestones based on time range
          const now = new Date();
          let filteredMilestones = goal.milestones;

          if (timeRange && timeRange !== 'all') {
            const startDate = new Date();
            switch (timeRange) {
              case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
              case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
              case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
              case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            }

            filteredMilestones = goal.milestones.filter(milestone => {
              const milestoneDate = new Date(milestone.createdAt);
              return milestoneDate >= startDate;
            });
          }

          const completedMilestones = filteredMilestones.filter(m => m.status === MilestoneStatus.DONE);
          const progress = filteredMilestones.length > 0
            ? Math.round((completedMilestones.length / filteredMilestones.length) * 100)
            : 0;

          // Calculate average completion time for completed milestones
          const completedWithDates = completedMilestones.filter(m => m.completedAt);
          const averageCompletionTime = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, milestone) => {
              const created = new Date(milestone.createdAt);
              const completed = new Date(milestone.completedAt!);
              return sum + Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / completedWithDates.length
            : 0;

          // Generate progress history based on time range
          const progressHistory = get().generateProgressHistory(goal, timeRange || 'all');

          const analytics = {
            goalId,
            timeRange: timeRange || 'all',
            totalMilestones: filteredMilestones.length,
            completedMilestones: completedMilestones.length,
            progress,
            progressHistory,
            averageMilestoneCompletionTime: Math.round(averageCompletionTime),
            streak: 5, // This could be calculated based on actual activity
            estimatedCompletionDate: goal.targetDate,
            insights: [
              progress > 80 ? 'You\'re almost there! Keep up the great work!' :
                progress > 50 ? 'You\'re making excellent progress towards your goal' :
                  progress > 25 ? 'You\'re off to a good start - keep the momentum going!' :
                    'Every journey begins with a single step - you\'ve got this!',
              filteredMilestones.length > 0 && progress < 50 ? 'Consider breaking down larger milestones into smaller tasks' : null,
              completedMilestones.length > 0 ? 'Your consistency is paying off - keep it up!' : null
            ].filter(Boolean)
          };

          set({ isLoading: false });
          return analytics;
        } catch (error: any) {
          logger.error('Get goal analytics error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'goal-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: any) => ({
        ...persistedState,
        searchQuery: '',
        statusFilter: [],
        priorityFilter: [],
        categoryFilter: [],
      }),
      partialize: (state) => ({
        goals: state.goals,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
