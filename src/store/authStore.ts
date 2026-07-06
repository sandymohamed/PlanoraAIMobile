import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { apiClient } from '@/services/apiClient';
import { getApiErrorMessage } from '@/utils/apiError';
import { logger } from '@/utils/logger';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface StoredAuthTokens {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

function parseAuthPayload(res: ApiEnvelope<{ user: User; tokens: AuthTokens }>) {
  if (!res?.success || !res.data?.user || !res.data?.tokens) {
    throw new Error('Invalid response from server');
  }
  return res.data;
}

function parseRefreshPayload(res: ApiEnvelope<AuthTokens | { tokens: AuthTokens }>): AuthTokens {
  const data = res?.data;
  if (!data) {
    throw new Error('Invalid refresh response from server');
  }
  const tokens = 'tokens' in data ? data.tokens : data;
  if (!tokens?.accessToken || !tokens.refreshToken) {
    throw new Error('Invalid refresh response from server');
  }
  return tokens;
}

async function readStoredTokens(): Promise<StoredAuthTokens | null> {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return null;
    return JSON.parse(creds.password) as StoredAuthTokens;
  } catch (error) {
    logger.warn('[Planora Auth] failed to read stored tokens', getApiErrorMessage(error));
    return null;
  }
}

async function storeTokens(tokens: AuthTokens): Promise<void> {
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('Cannot store incomplete auth tokens');
  }
  await Keychain.setGenericPassword(
    'planora_tokens',
    JSON.stringify({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
  );
}

let refreshPromise: Promise<boolean> | null = null;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  completeOnboarding: () => void;
  updateUser: (user: User) => void;
  getToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      hasCompletedOnboarding: false,

      getToken: async () => {
        const tokens = await readStoredTokens();
        return tokens?.token ?? tokens?.accessToken ?? null;
      },

      login: async (email, password) => {
        logger.info('[Planora Auth] login');
        const res = await apiClient.post<ApiEnvelope<{ user: User; tokens: AuthTokens }>>('/auth/login', {
          email,
          password,
        });
        const { user, tokens } = parseAuthPayload(res);
        await storeTokens(tokens);
        logger.info('[Planora Auth] login OK');
        set({ user, isAuthenticated: true });
      },

      register: async (email, password, name) => {
        logger.info('[Planora Auth] signup');
        const res = await apiClient.post<ApiEnvelope<{ user: User; tokens: AuthTokens }>>('/auth/signup', {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        const { user, tokens } = parseAuthPayload(res);
        await storeTokens(tokens);
        logger.info('[Planora Auth] signup OK');
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          const creds = await Keychain.getGenericPassword();
          const refreshToken = creds ? JSON.parse(creds.password).refreshToken : undefined;
          await apiClient.post(
            '/auth/logout',
            { refreshToken },
            { skipAuthHeader: true, skipAuthRetry: true }
          );
        } catch {
          /* ignore */
        }
        await get().clearSession();
      },

      clearSession: async () => {
        await Keychain.resetGenericPassword();
        import('./goalStore')
          .then(({ useGoalStore }) => useGoalStore.getState().clearFilters())
          .catch(() => {});
        set({ user: null, isAuthenticated: false });
      },

      refreshAuthToken: async () => {
        if (refreshPromise) return refreshPromise;

        refreshPromise = (async () => {
          const storedTokens = await readStoredTokens();
          const refreshToken = storedTokens?.refreshToken;
          if (!refreshToken) return false;

          try {
            const res = await apiClient.post<ApiEnvelope<AuthTokens | { tokens: AuthTokens }>>(
              '/auth/refresh',
              { refreshToken },
              { skipAuthHeader: true, skipAuthRetry: true }
            );
            const tokens = parseRefreshPayload(res);
            await storeTokens(tokens);
            logger.info('[Planora Auth] token refresh OK');
            return true;
          } catch (error) {
            logger.warn('[Planora Auth] token refresh failed', getApiErrorMessage(error));
            return false;
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },

      initializeAuth: async () => {
        try {
          const health = await apiClient.pingHealth();
          logger.info('[Planora] backend health', { ok: health.ok });

          const storedTokens = await readStoredTokens();
          if (!storedTokens?.token && !storedTokens?.accessToken && !storedTokens?.refreshToken) {
            return;
          }

          // Bootstrap without interceptor refresh/logout loops
          if (storedTokens.token || storedTokens.accessToken) {
            try {
              const res = await apiClient.get<ApiEnvelope<User>>('/me', { skipAuthRetry: true });
              set({ user: res.data, isAuthenticated: true });
              logger.info('[Planora Auth] session restored');
              return;
            } catch {
              logger.info('[Planora Auth] access token expired, trying refresh');
            }
          }

          const refreshed = await get().refreshAuthToken();
          if (refreshed) {
            try {
              const res = await apiClient.get<ApiEnvelope<User>>('/me', { skipAuthRetry: true });
              set({ user: res.data, isAuthenticated: true });
              logger.info('[Planora Auth] session restored after refresh');
              return;
            } catch (e) {
              logger.warn('[Planora Auth] /me failed after refresh', getApiErrorMessage(e));
            }
          } else {
            logger.warn('[Planora Auth] refresh token invalid or expired — sign in again');
          }

          await get().clearSession();
        } finally {
          set({ isInitialized: true });
        }
      },

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      updateUser: (user) => set({ user }),
    }),
    {
      name: 'planora-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasCompletedOnboarding: s.hasCompletedOnboarding }),
    }
  )
);
