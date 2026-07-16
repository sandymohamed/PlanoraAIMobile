import { apiClient } from "./apiClient";
import {
  Alarm,
  CreateAlarmData,
  UpdateAlarmData,
  Timer,
  CreateTimerData,
  UpdateTimerData,
} from "@/types/alarm";
import { ApiResponse } from "@/types/api";
import { logger } from "@/utils/logger";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AlarmApiService {
  // Alarm methods
  async getAlarms(
    page = 1,
    limit = 20,
    enabled?: boolean,
  ): Promise<PaginatedResponse<Alarm>> {
    try {
      const params: any = { page, limit };
      if (enabled !== undefined) {
        params.enabled = enabled;
      }
      const response = await apiClient.get<PaginatedResponse<Alarm>>(
        "/alarms",
        { params },
      );
      console.log("alarmApiService: Get alarms response:", response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getAlarm(id: string): Promise<Alarm> {
    try {
      const response = await apiClient.get<ApiResponse<Alarm>>(`/alarms/${id}`);
      if (!response.success) {
        throw new Error(response.error || "Failed to get alarm");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createAlarm(data: CreateAlarmData): Promise<Alarm> {
    try {
      const response = await apiClient.post<ApiResponse<Alarm>>(
        "/alarms",
        data,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to create alarm");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateAlarm(id: string, data: UpdateAlarmData): Promise<Alarm> {
    try {
      const response = await apiClient.put<ApiResponse<Alarm>>(
        `/alarms/${id}`,
        data,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to update alarm");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteAlarm(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/alarms/${id}`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to delete alarm");
      }
    } catch (error) {
      throw error;
    }
  }

  async snoozeAlarm(id: string, duration?: number): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `/alarms/${id}/snooze`,
        { duration },
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to snooze alarm");
      }
    } catch (error) {
      throw error;
    }
  }

  async dismissAlarm(id: string): Promise<void> {
    try {
      const response = await apiClient.post<ApiResponse<void>>(
        `/alarms/${id}/dismiss`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to dismiss alarm");
      }
    } catch (error) {
      throw error;
    }
  }

  // Timer methods (if timers are in the same route, otherwise create separate service)
  async getTimers(page = 1, limit = 20): Promise<PaginatedResponse<Timer>> {
    try {
      // Note: Adjust endpoint if timers are in a different route
      const response = await apiClient.get<PaginatedResponse<Timer>>(
        "/timers",
        {
          params: { page, limit },
        },
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createTimer(data: CreateTimerData): Promise<Timer> {
    try {
      const response = await apiClient.post<ApiResponse<Timer>>(
        "/timers",
        data,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to create timer");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateTimer(id: string, data: UpdateTimerData): Promise<Timer> {
    try {
      const response = await apiClient.put<ApiResponse<Timer>>(
        `/timers/${id}`,
        data,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to update timer");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteTimer(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/timers/${id}`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to delete timer");
      }
    } catch (error) {
      throw error;
    }
  }

  async startTimer(id: string): Promise<Timer> {
    try {
      const response = await apiClient.post<ApiResponse<Timer>>(
        `/timers/${id}/start`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to start timer");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async pauseTimer(id: string): Promise<Timer> {
    try {
      const response = await apiClient.post<ApiResponse<Timer>>(
        `/timers/${id}/pause`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to pause timer");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async stopTimer(id: string): Promise<Timer> {
    try {
      const response = await apiClient.post<ApiResponse<Timer>>(
        `/timers/${id}/stop`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to stop timer");
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async resetTimer(id: string): Promise<Timer> {
    try {
      const response = await apiClient.post<ApiResponse<Timer>>(
        `/timers/${id}/reset`,
      );
      if (!response.success) {
        throw new Error(response.error || "Failed to reset timer");
      }
      return response.data;
    } catch (error) {
      logger.error("Reset timer error:", error);
      throw error;
    }
  }
}

export const alarmService = new AlarmApiService();
