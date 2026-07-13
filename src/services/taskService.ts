// services/taskService.ts
import { apiClient } from '@/services/apiClient';
import { Task, CreateTaskData, UpdateTaskData } from '@/types/task';
import { ApiResponse } from '@/types/api';
import { logger } from '@/utils/logger';

class TaskService {
  async getTasks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    goalId?: string;
    assigneeId?: string;
  }): Promise<Task[]> {
    try {
      const response = await apiClient.get<ApiResponse<Task[]>>('/tasks', { params });
      if (!response.success) {
        throw new Error(response.error || 'Failed to get tasks');
      }
      return response.data;
    } catch (error) {
      logger.error('Get tasks error:', error);
      throw error;
    }
  }

  async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
    if (!response.success) throw new Error(response.error || 'Failed to get task');
    return response.data;
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>('/tasks', data);
    if (!response.success) throw new Error(response.error || 'Failed to create task');
    return response.data;
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, data);
    if (!response.success) throw new Error(response.error || 'Failed to update task');
    return response.data;
  }

  async deleteTask(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/tasks/${id}`);
    if (!response.success) throw new Error(response.error || 'Failed to delete task');
  }

  async completeTask(id: string): Promise<Task> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${id}/complete`);
    if (!response.success) throw new Error(response.error || 'Failed to complete task');
    return response.data;
  }

  async uncompleteTask(id: string): Promise<Task> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${id}/uncomplete`);
    if (!response.success) throw new Error(response.error || 'Failed to uncomplete task');
    return response.data;
  }

  async assignTask(id: string, assigneeId: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/assign`, { assigneeId });
    if (!response.success) throw new Error(response.error || 'Failed to assign task');
    return response.data;
  }

  async updateTaskOrder(taskOrders: { id: string; order: number }[]): Promise<void> {
    const response = await apiClient.patch<ApiResponse<void>>('/tasks/reorder', { taskOrders });
    if (!response.success) throw new Error(response.error || 'Failed to update task order');
  }
}

export const taskService = new TaskService();
