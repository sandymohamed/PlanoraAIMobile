import { apiClient } from './apiClient';
import {
  Goal,
  CreateGoalData,
  UpdateGoalData,
  AIPlanRequest,
  GeneratedPlanResult,
  Milestone,
  CreateGoalMilestoneData,
  UpdateGoalMilestoneData,
} from '@/types/goal';
import { ApiResponse } from '@/types/api';
import { logger } from '@/utils/logger';

class GoalService {
  async getGoals(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<Goal[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Goal[]>>('/goals', {
        params,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get goals');
      }

      return response;
    } catch (error) {
      logger.error('Get goals error:', error);
      throw error;
    }
  }

  async getGoal(id: string): Promise<Goal> {
    try {
      const response = await apiClient.get<ApiResponse<Goal>>(`/goals/${id}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get goal');
      }

      return response.data;
    } catch (error) {
      logger.error('Get goal error:', error);
      throw error;
    }
  }

  async createGoal(data: CreateGoalData): Promise<Goal> {
    try {
      const response = await apiClient.post<ApiResponse<Goal>>('/goals', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create goal');
      }

      return response.data;
    } catch (error) {
      logger.error('Create goal error:', error);
      throw error;
    }
  }

  async updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    try {
      const response = await apiClient.put<ApiResponse<Goal>>(`/goals/${id}`, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update goal');
      }

      return response.data;
    } catch (error) {
      logger.error('Update goal error:', error);
      throw error;
    }
  }

  async deleteGoal(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/goals/${id}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete goal');
      }
    } catch (error) {
      logger.error('Delete goal error:', error);
      throw error;
    }
  }

  async generateAIPlan(data: AIPlanRequest): Promise<GeneratedPlanResult> {
    try {
      const response = await apiClient.post<ApiResponse<GeneratedPlanResult>>(
        '/ai/generate-plan',
        data,
        { timeout: 60000 }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate AI plan');
      }

      return response.data;
    } catch (error) {
      logger.error('Generate AI plan error:', error);
      throw error;
    }
  }

  async generateSimplePlan(goalTitle: string): Promise<GeneratedPlanResult> {
    try {
      const response = await apiClient.post<ApiResponse<GeneratedPlanResult>>('/ai/generate-simple-plan', {
        goalTitle,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate simple plan');
      }

      return response.data;
    } catch (error) {
      logger.error('Generate simple plan error:', error);
      throw error;
    }
  }

  async searchGoals(query: string): Promise<Goal[]> {
    try {
      const response = await this.getGoals({search: query});
      return response.data;
    } catch (error) {
      logger.error('Search goals error:', error);
      throw error;
    }
  }

  // Milestone management
  async getMilestones(goalId: string): Promise<Milestone[]> {
    try {
      const response = await apiClient.get<ApiResponse<Milestone[]>>(`/goals/${goalId}/milestones`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get milestones');
      }

      return response.data;
    } catch (error) {
      logger.error('Get milestones error:', error);
      throw error;
    }
  }

  async createMilestone(goalId: string, data: CreateGoalMilestoneData): Promise<Milestone> {
    try {
      const payload = {
        ...data,
        dueDate: data.dueDate ?? data.targetDate,
      };

      const response = await apiClient.post<ApiResponse<Milestone>>(`/goals/${goalId}/milestones`, payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create milestone');
      }

      return response.data;
    } catch (error) {
      logger.error('Create milestone error:', error);
      throw error;
    }
  }

  async updateMilestone(goalId: string, milestoneId: string, data: UpdateGoalMilestoneData): Promise<Milestone> {
    try {
      const payload = {
        ...data,
        dueDate: data.dueDate ?? data.targetDate,
      };

      const response = await apiClient.put<ApiResponse<Milestone>>(`/goals/${goalId}/milestones/${milestoneId}`, payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update milestone');
      }

      return response.data;
    } catch (error) {
      logger.error('Update milestone error:', error);
      throw error;
    }
  }

  async deleteMilestone(goalId: string, milestoneId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/goals/${goalId}/milestones/${milestoneId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete milestone');
      }
    } catch (error) {
      logger.error('Delete milestone error:', error);
      throw error;
    }
  }

  async completeMilestone(goalId: string, milestoneId: string): Promise<Milestone> {
    try {
      const response = await apiClient.post<ApiResponse<Milestone>>(`/goals/${goalId}/milestones/${milestoneId}/complete`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to complete milestone');
      }

      return response.data;
    } catch (error) {
      logger.error('Complete milestone error:', error);
      throw error;
    }
  }

  // Goal actions
  async completeGoal(id: string): Promise<Goal> {
    try {
      const response = await apiClient.post<ApiResponse<Goal>>(`/goals/${id}/complete`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to complete goal');
      }

      return response.data;
    } catch (error) {
      logger.error('Complete goal error:', error);
      throw error;
    }
  }

  async pauseGoal(id: string): Promise<Goal> {
    try {
      const response = await apiClient.post<ApiResponse<Goal>>(`/goals/${id}/pause`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to pause goal');
      }

      return response.data;
    } catch (error) {
      logger.error('Pause goal error:', error);
      throw error;
    }
  }

  async resumeGoal(id: string): Promise<Goal> {
    try {
      const response = await apiClient.post<ApiResponse<Goal>>(`/goals/${id}/resume`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to resume goal');
      }

      return response.data;
    } catch (error) {
      logger.error('Resume goal error:', error);
      throw error;
    }
  }

  // async cancelGoal(id: string): Promise<Goal> {
  //   try {
  //     const response = await apiClient.post<ApiResponse<Goal>>(`/goals/${id}/cancel`);

  //     if (!response.success) {
  //       throw new Error(response.error || 'Failed to cancel goal');
  //     }

  //     return response.data;
  //   } catch (error) {
  //     logger.error('Cancel goal error:', error);
  //     throw error;
  //   }
  // }
}

export const goalService = new GoalService();
