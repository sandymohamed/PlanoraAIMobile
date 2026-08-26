import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import { captureException } from "@/analytics/sentry";
import { getApiBaseUrl, getApiRootUrl } from "@/config/remoteConfig";

const LOG = __DEV__;

/** Auth routes must not trigger 401 → refresh → logout loops */
const AUTH_SKIP_RETRY_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
];

export type PlanoraRequestConfig = AxiosRequestConfig & {
  /** Do not attach Bearer token (login/refresh/signup) */
  skipAuthHeader?: boolean;
  /** Do not run refresh/logout on 401 (used during session bootstrap) */
  skipAuthRetry?: boolean;
};

function isAuthSkipPath(url?: string): boolean {
  if (!url) return false;
  return AUTH_SKIP_RETRY_PATHS.some((p) => url.includes(p));
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private queue: Array<{
    resolve: (t?: string) => void;
    reject: (e: unknown) => void;
  }> = [];

  private flushQueue(error?: unknown, token?: string) {
    this.queue.forEach((pending) => {
      if (error) pending.reject(error);
      else pending.resolve(token);
    });
    this.queue = [];
  }

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 20000,
      headers: { "Content-Type": "application/json" },
    });
    this.setupInterceptors();
  }

  public updateBaseUrl() {
    const newBaseUrl = getApiBaseUrl();

    this.client.defaults.baseURL = newBaseUrl;
  }
  private setupInterceptors() {
    this.client.interceptors.request.use(async (conf) => {
      const cfg = conf as PlanoraRequestConfig;
      const skipHeader = cfg.skipAuthHeader || isAuthSkipPath(cfg.url);
      if (!skipHeader) {
        const token = await useAuthStore.getState().getToken();
        if (token) conf.headers.Authorization = `Bearer ${token}`;
      }
      // if (LOG) {
      //   console.log(`[Planora API] → ${conf.method?.toUpperCase()} ${conf.url}`, conf.data ?? '');
      // }
      return conf;
    });

    this.client.interceptors.response.use(
      (r) => {
        // if (LOG) {
        //   console.log(`[Planora API] ← ${r.status} ${r.config.url}`, r.data);
        // }
        return r;
      },
      async (error: AxiosError) => {
        if (LOG) {
          console.warn(
            `[Planora API] ✗ ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
            error,
            error.response?.status,
            error.response?.data ?? error.message,
          );
        }
        const original = error.config;
        if (!original) {
          throw error;
        }

        // Report server-side (5xx) and network failures to Sentry. We send only
        // method/url/status — never request bodies, tokens, or response payloads.
        const status = error.response?.status;
        if (!status || status >= 500) {
          captureException(error, {
            method: original.method?.toUpperCase(),
            url: original.url,
            status: status ?? "network_error",
          });
        }

        const cfg = original as AxiosRequestConfig & {
          skipAuthRetry?: boolean;
          _retry?: boolean;
          _networkRetry?: boolean;
          _serviceRetry?: boolean;
        };
        const isNetworkError =
          !error.response &&
          (error.code === "ERR_NETWORK" ||
            error.message === "Network Error" ||
            error.message.includes("Network"));

        if (isNetworkError && !cfg._networkRetry) {
          cfg._networkRetry = true;
          await new Promise<void>((resolve) =>
            setTimeout(() => resolve(), 500),
          );
          // if (LOG) console.log(`[Planora API] ↻ retry ${cfg.method?.toUpperCase()} ${cfg.url}`);
          return this.client(cfg);
        }

        const errBody = error.response?.data as { code?: string } | undefined;
        const isTransientDb =
          error.response?.status === 503 ||
          errBody?.code === "SERVICE_UNAVAILABLE" ||
          (error.response?.status === 400 &&
            errBody?.code === "DATABASE_ERROR");

        if (isTransientDb && !cfg._serviceRetry) {
          cfg._serviceRetry = true;
          await new Promise<void>((resolve) =>
            setTimeout(() => resolve(), 800),
          );
          // if (LOG) console.log(`[Planora API] ↻ retry (db) ${cfg.method?.toUpperCase()} ${cfg.url}`);
          return this.client(cfg);
        }

        if (
          error.response?.status !== 401 ||
          cfg._retry ||
          cfg.skipAuthRetry ||
          isAuthSkipPath(cfg.url)
        ) {
          throw error;
        }

        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject });
          }).then((token) => {
            if (!token) throw error;
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${token}`;
            return this.client(original);
          });
        }

        cfg._retry = true;
        this.isRefreshing = true;
        let ok = false;
        try {
          ok = await useAuthStore.getState().refreshAuthToken();
        } finally {
          this.isRefreshing = false;
        }

        if (ok) {
          const token = await useAuthStore.getState().getToken();
          if (!token) {
            const missingTokenError = new Error(
              "Token refresh succeeded without an access token",
            );
            this.flushQueue(missingTokenError);
            await useAuthStore.getState().clearSession();
            throw missingTokenError;
          }
          this.flushQueue(undefined, token);
          cfg.headers = cfg.headers ?? {};
          cfg.headers.Authorization = `Bearer ${token}`;
          return this.client(cfg);
        }
        this.flushQueue(error);
        await useAuthStore
          .getState()
          .clearSession({ reason: "session_expired" });
        throw error;
      },
    );
  }

  get<T>(url: string, config?: PlanoraRequestConfig) {
    return this.client.get<T>(url, config).then((r) => r.data);
  }
  post<T>(url: string, data?: unknown, config?: PlanoraRequestConfig) {
    return this.client.post<T>(url, data, config).then((r) => r.data);
  }
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.put<T>(url, data, config).then((r) => r.data);
  }
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.client.patch<T>(url, data, config).then((r) => r.data);
  }
  delete<T>(url: string, config?: PlanoraRequestConfig) {
    return this.client.delete<T>(url, config).then((r) => {
      return r.data;
    });
  }

  /** Ping backend /health (no auth). */
  async pingHealth(): Promise<{ ok: boolean; detail: string }> {
    const url = `${getApiRootUrl()}/health`;
    try {
      const res = await axios.get(url, { timeout: 8000 });
      // if (LOG) console.log('[Planora] health OK', res.data);
      return { ok: true, detail: JSON.stringify(res.data) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // if (LOG) console.warn('[Planora] health FAIL', msg);
      return { ok: false, detail: msg };
    }
  }
}
export const apiClient = new ApiClient();
