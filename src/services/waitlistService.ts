import { apiClient } from '@/services/apiClient';
import { logger } from '@/utils/logger';

export type WaitlistSource = 'paywall' | 'landing' | 'popup';

class WaitlistService {
  /** Join the premium waitlist. Backend is idempotent per (email, source). */
  async join(email: string, source: WaitlistSource): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean }>('/waitlist', { email, source });
      return !!res.success;
    } catch (error) {
      logger.error('Waitlist join error:', error);
      throw error;
    }
  }
}

export const waitlistService = new WaitlistService();
