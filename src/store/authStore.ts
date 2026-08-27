import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { apiClient } from "@/services/apiClient";
import { getApiErrorMessage } from "@/utils/apiError";
import { logger } from "@/utils/logger";
import { track, trackFailure, AnalyticsEvents } from "@/analytics/posthog";
import { identifyCurrentUser } from "@/analytics/identifyUser";
import { alarmService } from "@/services/alarmApiService";
import { useTaskStore } from "./taskStore";
import { useGoalStore } from "./goalStore";
import { useAlarmStore } from "./alarmStore";
import { reliableAlarmService } from "@/features/alarms/ReliableAlarmService";
import { pushNotificationService } from "@/services/pushNotificationService";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";
import "@/services/googleAuthService";

export interface User {
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

function parseAuthPayload(
  res: ApiEnvelope<{ user: User; tokens: AuthTokens }>,
) {
  if (!res?.success || !res.data?.user || !res.data?.tokens) {
    throw new Error("Invalid response from server");
  }
  return res.data;
}

function parseRefreshPayload(
  res: ApiEnvelope<AuthTokens | { tokens: AuthTokens }>,
): AuthTokens {
  const data = res?.data;
  if (!data) {
    throw new Error("Invalid refresh response from server");
  }
  const tokens = "tokens" in data ? data.tokens : data;
  if (!tokens?.accessToken || !tokens.refreshToken) {
    throw new Error("Invalid refresh response from server");
  }
  return tokens;
}

async function readStoredTokens(): Promise<StoredAuthTokens | null> {
  try {
    const creds = await Keychain.getGenericPassword();
    if (!creds) return null;
    return JSON.parse(creds.password) as StoredAuthTokens;
  } catch (error) {
    logger.warn(
      "[Planora Auth] failed to read stored tokens",
      getApiErrorMessage(error),
    );
    return null;
  }
}

async function storeTokens(tokens: AuthTokens): Promise<void> {
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error("Cannot store incomplete auth tokens");
  }
  await Keychain.setGenericPassword(
    "planora_tokens",
    JSON.stringify({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
  );
}

let refreshPromise: Promise<boolean> | null = null;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: (options?: {
    reason?: "session_expired" | "manual";
  }) => Promise<void>;
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
        logger.info("[Planora Auth] login");

        try {
          const res = await apiClient.post<
            ApiEnvelope<{ user: User; tokens: AuthTokens }>
          >("/auth/login", {
            email,
            password,
          });
          const { user, tokens } = parseAuthPayload(res);
          await storeTokens(tokens);
          set({ user, isAuthenticated: true });
          track(AnalyticsEvents.USER_LOGGED_IN, { method: "email" });
          identifyCurrentUser();

          // Fetch alarms after successful registration
          const alarms = await alarmService.getAlarms();
        } catch (error) {
          trackFailure(AnalyticsEvents.LOGIN_FAILED, error, {
            method: "email",
          });
          throw error;
        }
      },
      loginWithGoogle: async () => {
        try {
          await GoogleSignin.hasPlayServices({
            showPlayServicesUpdateDialog: true,
          });

          const result = await GoogleSignin.signIn();

          if (result.type !== "success") {
            throw new Error("Google sign-in was cancelled");
          }

          const { idToken } = result.data;

          if (!idToken) {
            throw new Error("Google did not return an ID token");
          }

          const googleCredential = auth.GoogleAuthProvider.credential(idToken);

          const firebaseResult =
            await auth().signInWithCredential(googleCredential);

          const firebaseIdToken = await firebaseResult.user.getIdToken();

          logger.info("[Planora Auth] Firebase Google sign-in successful");

          // Send Firebase token to Planora backend
          const res = await apiClient.post<
            ApiEnvelope<{ user: User; tokens: AuthTokens }>
          >("/auth/google", {
            idToken: firebaseIdToken,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          });

          const { user, tokens } = parseAuthPayload(res);

          await storeTokens(tokens);

          set({
            user,
            isAuthenticated: true,
          });

          track(AnalyticsEvents.USER_LOGGED_IN, {
            method: "google",
          });

          identifyCurrentUser();

          // Fetch alarms after successful login
          await alarmService.getAlarms();

          logger.info("[Planora Auth] Google login successful");
        } catch (error) {
          logger.warn(
            "[Planora Auth] Google sign-in failed",
            getApiErrorMessage(error),
          );

          trackFailure(AnalyticsEvents.LOGIN_FAILED, error, {
            method: "google",
          });

          throw error;
        }
      },

      register: async (email, password, name) => {
        try {
          const res = await apiClient.post<
            ApiEnvelope<{ user: User; tokens: AuthTokens }>
          >("/auth/signup", {
            email: email.trim().toLowerCase(),
            password,
            name: name.trim(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          });
          const { user, tokens } = parseAuthPayload(res);
          await storeTokens(tokens);
          logger.info("[Planora Auth] signup OK");
          set({ user, isAuthenticated: true });
          track(AnalyticsEvents.USER_SIGNED_UP, { method: "email" });
          track(AnalyticsEvents.SIGNUP_COMPLETED, { method: "email" });
          identifyCurrentUser();

          // Fetch alarms after successful registration
          const alarms = await alarmService.getAlarms();
        } catch (error) {
          trackFailure(AnalyticsEvents.SIGNUP_FAILED, error, {
            method: "email",
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          const creds = await Keychain.getGenericPassword();
          const refreshToken = creds
            ? JSON.parse(creds.password).refreshToken
            : undefined;

          await apiClient.post(
            "/auth/logout",
            { refreshToken },
            { skipAuthHeader: true, skipAuthRetry: true },
          );
        } catch {
          // ignore backend failure
        }

        await get().clearSession({ reason: "manual" });

        track(AnalyticsEvents.USER_LOGGED_OUT);
      },

      clearSession: async (options) => {
        logger.info("Clearing user session");

        await pushNotificationService.deleteToken();

        // Stop any playing alarm and cancel all scheduled alarms
        await reliableAlarmService.cleanUp();

        // Reset all user stores
        useTaskStore.getState().reset();
        useGoalStore.getState().reset();
        await useAlarmStore.getState().reset();

        // Clear auth
        await Keychain.resetGenericPassword();

        import("./goalStore")
          .then(({ useGoalStore }) => useGoalStore.getState().clearFilters())
          .catch(() => {});

        set({
          user: null,
          isAuthenticated: false,
        });

        if (options?.reason === "session_expired") {
          track(AnalyticsEvents.SESSION_EXPIRED);
        }
      },

      refreshAuthToken: async () => {
        if (refreshPromise) return refreshPromise;

        refreshPromise = (async () => {
          const storedTokens = await readStoredTokens();
          const refreshToken = storedTokens?.refreshToken;
          if (!refreshToken) return false;

          try {
            const res = await apiClient.post<
              ApiEnvelope<AuthTokens | { tokens: AuthTokens }>
            >(
              "/auth/refresh",
              { refreshToken },
              { skipAuthHeader: true, skipAuthRetry: true },
            );
            const tokens = parseRefreshPayload(res);
            await storeTokens(tokens);
            logger.info("[Planora Auth] token refresh OK");
            return true;
          } catch (error) {
            logger.warn(
              "[Planora Auth] token refresh failed",
              getApiErrorMessage(error),
            );
            track(AnalyticsEvents.REFRESH_TOKEN_FAILED);
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
          logger.info("[Planora] backend health", { ok: health.ok });

          const storedTokens = await readStoredTokens();
          if (
            !storedTokens?.token &&
            !storedTokens?.accessToken &&
            !storedTokens?.refreshToken
          ) {
            return;
          }

          // Bootstrap without interceptor refresh/logout loops
          if (storedTokens.token || storedTokens.accessToken) {
            try {
              const res = await apiClient.get<ApiEnvelope<User>>("/me", {
                skipAuthRetry: true,
              });
              set({ user: res.data, isAuthenticated: true });
              logger.info("[Planora Auth] session restored");
              identifyCurrentUser();
              return;
            } catch {
              logger.info(
                "[Planora Auth] access token expired, trying refresh",
              );
            }
          }

          const refreshed = await get().refreshAuthToken();
          if (refreshed) {
            try {
              const res = await apiClient.get<ApiEnvelope<User>>("/me", {
                skipAuthRetry: true,
              });
              set({ user: res.data, isAuthenticated: true });
              logger.info("[Planora Auth] session restored after refresh");
              identifyCurrentUser();
              return;
            } catch (e) {
              logger.warn(
                "[Planora Auth] /me failed after refresh",
                getApiErrorMessage(e),
              );
            }
          } else {
            logger.warn(
              "[Planora Auth] refresh token invalid or expired — sign in again",
            );
          }

          await get().clearSession({ reason: "session_expired" });
        } finally {
          set({ isInitialized: true });
        }
      },

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      updateUser: (user) => set({ user }),
    }),
    {
      name: "planora-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasCompletedOnboarding: s.hasCompletedOnboarding }),
    },
  ),
);
