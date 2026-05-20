import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/config/env';
import { useAuthStore } from '@/store/authStore';

const LOG = __DEV__;

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private queue: Array<{ resolve: (t?: string) => void; reject: (e: unknown) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: config.API_BASE_URL,
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(async (conf) => {
      const token = await useAuthStore.getState().getToken();
      if (token) conf.headers.Authorization = `Bearer ${token}`;
      if (LOG) {
        console.log(`[Planora API] → ${conf.method?.toUpperCase()} ${conf.baseURL}${conf.url}`, conf.data ?? '');
      }
      return conf;
    });

    this.client.interceptors.response.use(
      (r) => {
        if (LOG) {
          console.log(`[Planora API] ← ${r.status} ${r.config.url}`, r.data);
        }
        return r;
      },
      async (error: AxiosError) => {
        if (LOG) {
          console.warn(
            `[Planora API] ✗ ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
            error.response?.status,
            error.response?.data ?? error.message
          );
        }
        const original = error.config;
        if (!original || error.response?.status !== 401 || (original as { _retry?: boolean })._retry) {
          throw error;
        }

        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject });
          }).then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return this.client(original);
          });
        }

        (original as { _retry?: boolean })._retry = true;
        this.isRefreshing = true;
        const ok = await useAuthStore.getState().refreshAuthToken();
        this.isRefreshing = false;

        if (ok) {
          const token = await useAuthStore.getState().getToken();
          this.queue.forEach((p) => p.resolve(token!));
          this.queue = [];
          original.headers.Authorization = `Bearer ${token}`;
          return this.client(original);
        }
        await useAuthStore.getState().logout();
        throw error;
      }
    );
  }

  get<T>(url: string) {
    return this.client.get<T>(url).then((r) => r.data);
  }
  post<T>(url: string, data?: unknown) {
    return this.client.post<T>(url, data).then((r) => r.data);
  }
  put<T>(url: string, data?: unknown) {
    return this.client.put<T>(url, data).then((r) => r.data);
  }
  patch<T>(url: string, data?: unknown) {
    return this.client.patch<T>(url, data).then((r) => r.data);
  }
  delete<T>(url: string) {
    return this.client.delete<T>(url).then((r) => r.data);
  }

  /** Ping backend /health (no auth). */
  async pingHealth(): Promise<{ ok: boolean; detail: string }> {
    const url = `${config.API_ROOT_URL}/health`;
    try {
      const res = await axios.get(url, { timeout: 8000 });
      if (LOG) console.log('[Planora] health OK', url, res.data);
      return { ok: true, detail: JSON.stringify(res.data) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (LOG) console.warn('[Planora] health FAIL', url, msg);
      return { ok: false, detail: msg };
    }
  }
}

export const apiClient = new ApiClient();
