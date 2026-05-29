import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosRequestConfig } from 'axios';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { useAuthStore } from '@/store/authStore';

const QUEUE_KEY = '@planora_offline_mutation_queue';
const MAX_RETRIES = 3;

export type QueuedMutation = {
  id: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  url: string;
  data?: unknown;
  createdAt: number;
  retries: number;
};

async function loadQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueMutation(
  method: QueuedMutation['method'],
  url: string,
  data?: unknown
): Promise<void> {
  const queue = await loadQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    method,
    url,
    data,
    createdAt: Date.now(),
    retries: 0,
  });
  await saveQueue(queue);
  logger.info('Offline queue: enqueued', { method, url });
}

export async function getQueueLength(): Promise<number> {
  return (await loadQueue()).length;
}

export async function processOfflineQueue(): Promise<{ processed: number; failed: number }> {
  const token = await useAuthStore.getState().getToken();
  if (!token) return { processed: 0, failed: 0 };

  const queue = await loadQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      const req: AxiosRequestConfig = {
        baseURL: config.API_BASE_URL,
        url: item.url,
        method: item.method,
        data: item.data,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      };
      await axios.request(req);
      processed++;
    } catch (e) {
      item.retries += 1;
      if (item.retries < MAX_RETRIES) {
        remaining.push(item);
      } else {
        failed++;
        logger.warn('Offline queue: dropped mutation after max retries', item.url);
      }
    }
  }

  await saveQueue(remaining);
  if (processed > 0) {
    logger.info('Offline queue: synced', { processed, failed, remaining: remaining.length });
  }
  return { processed, failed };
}
