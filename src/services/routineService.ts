import { apiClient } from './apiClient';
import {
  Routine,
  RoutineTask,
  CreateRoutineData,
  UpdateRoutineData,
  CreateRoutineTaskData,
  UpdateRoutineTaskData,
} from '@/types/routine';
import { ApiResponse } from '@/types/api';
import { logger } from '@/utils/logger';

class RoutineServiceClass {
  // Get all routines for the current user
  async getUserRoutines(): Promise<Routine[]> {
    try {
      const response = await apiClient.get<ApiResponse<Routine[]>>('/routines');

      if (!response.success) {
        throw new Error(response.error || 'Failed to get routines');
      }

      return response.data;
    } catch (error) {
      logger.error('Get user routines error:', error);
      throw error;
    }
  }

  // Get a single routine by ID
  async getRoutineById(routineId: string): Promise<Routine> {
    try {
      const response = await apiClient.get<ApiResponse<Routine>>(`/routines/${routineId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get routine');
      }

      return response.data;
    } catch (error) {
      logger.error('Get routine error:', error);
      throw error;
    }
  }

  // Create a new routine
  async createRoutine(data: CreateRoutineData): Promise<Routine> {
    try {
      const response = await apiClient.post<ApiResponse<Routine>>('/routines', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create routine');
      }

      return response.data;
    } catch (error) {
      logger.error('Create routine error:', error);
      throw error;
    }
  }

  // Update a routine
  async updateRoutine(routineId: string, data: UpdateRoutineData): Promise<Routine> {
    try {
      const response = await apiClient.put<ApiResponse<Routine>>(`/routines/${routineId}`, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update routine');
      }

      return response.data;
    } catch (error) {
      logger.error('Update routine error:', error);
      throw error;
    }
  }

  // Delete a routine
  async deleteRoutine(routineId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/routines/${routineId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete routine');
      }
    } catch (error) {
      logger.error('Delete routine error:', error);
      throw error;
    }
  }

  // Add a task to a routine
  async addTaskToRoutine(routineId: string, data: CreateRoutineTaskData): Promise<RoutineTask> {
    try {
      const response = await apiClient.post<ApiResponse<RoutineTask>>(
        `/routines/${routineId}/tasks`,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to add task');
      }

      return response.data;
    } catch (error) {
      logger.error('Add task to routine error:', error);
      throw error;
    }
  }

  // Update a routine task
  async updateRoutineTask(taskId: string, data: UpdateRoutineTaskData): Promise<RoutineTask> {
    try {
      const response = await apiClient.put<ApiResponse<RoutineTask>>(
        `/routines/tasks/${taskId}`,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update task');
      }

      return response.data;
    } catch (error) {
      logger.error('Update routine task error:', error);
      throw error;
    }
  }

  // Delete a routine task
  async deleteRoutineTask(taskId: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/routines/tasks/${taskId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete task');
      }
    } catch (error) {
      logger.error('Delete routine task error:', error);
      throw error;
    }
  }

  // Toggle task completion status
  async toggleTaskCompletion(taskId: string, completed: boolean): Promise<RoutineTask> {
    try {
      const response = await apiClient.put<ApiResponse<RoutineTask>>(
        `/routines/tasks/${taskId}/toggle`,
        { completed }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle task');
      }

      return response.data;
    } catch (error) {
      logger.error('Toggle task completion error:', error);
      throw error;
    }
  }

  // Reset routine tasks manually
  async resetRoutine(routineId: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(`/routines/${routineId}/reset`, {});

      if (!response.success) {
        throw new Error(response.error || 'Failed to reset routine');
      }
    } catch (error) {
      logger.error('Reset routine error:', error);
      throw error;
    }
  }
}

export const routineService = new RoutineServiceClass();

