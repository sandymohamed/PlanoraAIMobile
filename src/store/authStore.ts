import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { apiClient } from '@/services/apiClient';
import { getApiErrorMessage } from '@/utils/apiError';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
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

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  completeOnboarding: () => void;
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
        const creds = await Keychain.getGenericPassword();
        if (!creds) return null;
        return JSON.parse(creds.password).token ?? null;
      },

      login: async (email, password) => {
        console.log('[Planora Auth] login', email);
        const res = await apiClient.post<ApiEnvelope<{ user: User; tokens: AuthTokens }>>('/auth/login', {
          email,
          password,
        });
        const { user, tokens } = parseAuthPayload(res);
        await Keychain.setGenericPassword('planora_tokens', JSON.stringify({
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }));
        console.log('[Planora Auth] login OK', user.id);
        set({ user, isAuthenticated: true });
      },

      register: async (email, password, name) => {
        console.log('[Planora Auth] signup', email, name);
        const res = await apiClient.post<ApiEnvelope<{ user: User; tokens: AuthTokens }>>('/auth/signup', {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        const { user, tokens } = parseAuthPayload(res);
        await Keychain.setGenericPassword('planora_tokens', JSON.stringify({
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }));
        console.log('[Planora Auth] signup OK', user.id);
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          const creds = await Keychain.getGenericPassword();
          const refreshToken = creds ? JSON.parse(creds.password).refreshToken : undefined;
          await apiClient.post('/auth/logout', { refreshToken });
        } catch {
          /* ignore */
        }
        await Keychain.resetGenericPassword();
        set({ user: null, isAuthenticated: false });
      },

      refreshAuthToken: async () => {
        const creds = await Keychain.getGenericPassword();
        if (!creds) return false;
        const { refreshToken } = JSON.parse(creds.password);
        try {
          const res = await apiClient.post<ApiEnvelope<{ tokens: AuthTokens }>>('/auth/refresh', { refreshToken });
          const tokens = res.data.tokens;
          await Keychain.setGenericPassword('planora_tokens', JSON.stringify({
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          }));
          return true;
        } catch {
          return false;
        }
      },

      initializeAuth: async () => {
        const health = await apiClient.pingHealth();
        console.log('[Planora] backend health:', health.ok ? 'OK' : 'FAIL', health.detail);

        const token = await get().getToken();
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const res = await apiClient.get<ApiEnvelope<User>>('/me');
          set({ user: res.data, isAuthenticated: true, isInitialized: true });
        } catch (e) {
          console.warn('[Planora Auth] session invalid', getApiErrorMessage(e));
          await Keychain.resetGenericPassword();
          set({ isInitialized: true });
        }
      },

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'planora-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasCompletedOnboarding: s.hasCompletedOnboarding }),
    }
  )
);
