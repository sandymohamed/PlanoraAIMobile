import { apiClient } from '@/services/apiClient';
import { ApiResponse } from '@/types/api';
import { logger } from '@/utils/logger';

export interface AIPlanMilestone {
  title: string;
  description?: string;
  targetDate?: string;
  order?: number;
}

export interface AIPlanResponse {
  goalTitle: string;
  description?: string;
  milestones: AIPlanMilestone[];
  suggestedTasks?: { title: string; description?: string; dueDate?: string }[];
}

class AIService {
  async generatePlan(payload: {
    goalTitle: string;
    description?: string;
    targetDate?: string;
    category?: string;
  }): Promise<AIPlanResponse> {
    const res = await apiClient.post<ApiResponse<AIPlanResponse>>('/ai/generate-plan', payload);
    if (!res.success) throw new Error(res.error || 'AI plan failed');
    return res.data;
  }

  async generateSimplePlan(goalTitle: string): Promise<AIPlanResponse> {
    const res = await apiClient.post<ApiResponse<AIPlanResponse>>('/ai/generate-simple-plan', { goalTitle });
    if (!res.success) throw new Error(res.error || 'AI plan failed');
    return res.data;
  }
}

export const aiService = new AIService();
