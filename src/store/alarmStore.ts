import { create } from "zustand";
import {
  Alarm,
  CreateAlarmData,
  UpdateAlarmData,
  Timer,
  CreateTimerData,
  UpdateTimerData,
} from "@/types/alarm";
import { alarmService } from "@/services/alarmApiService";
import { notificationService } from "@/services/notificationService";
import { reliableAlarmService } from "@/services/ReliableAlarmService";
import { useAuthStore } from "@/store/authStore";
import { logger } from "@/utils/logger";
import { AlarmScheduleWarning } from "@/utils/alarmErrors";
import { track, trackFailure, AnalyticsEvents } from "@/analytics/posthog";
import { consumePendingAnalytics } from "@/analytics/pendingContext";
import { apiClient } from "@/services/apiClient";

interface AlarmState {
  // State
  alarms: Alarm[];
  timers: Timer[];
  activeTimer: Timer | null;
  loading: boolean;
  error: string | null;
  lastSaveTime: number | null;
  countdownInterval: ReturnType<typeof setInterval> | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  fetchAlarms: (
    page?: number,
    limit?: number,
    enabled?: boolean,
    retryCount?: number,
    options?: { scheduleNative?: boolean },
  ) => Promise<void>;
  fetchTimers: (page?: number, limit?: number) => Promise<void>;
  createAlarm: (data: CreateAlarmData) => Promise<Alarm>;
  updateAlarm: (id: string, data: UpdateAlarmData) => Promise<Alarm>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  snoozeAlarm: (id: string, duration?: number) => Promise<void>;
  dismissAlarm: (id: string) => Promise<void>;
  /** Permanently delete one-time alarms whose time has already passed. */
  cleanupExpiredAlarms: () => Promise<void>;

  createTimer: (data: CreateTimerData) => Promise<Timer>;
  updateTimer: (id: string, data: UpdateTimerData) => Promise<Timer>;
  deleteTimer: (id: string) => Promise<void>;
  startTimer: (id: string) => Promise<void>;
  pauseTimer: (id: string) => Promise<void>;
  stopTimer: (id: string) => Promise<void>;
  resetTimer: (id: string) => Promise<void>;
  setActiveTimer: (timer: Timer | null) => void;
  updateTimerRemainingTime: (id: string, remainingTime: number) => void;

  clearError: () => void;
  setLoading: (loading: boolean) => void;

  // Timer countdown methods
  startCountdown: () => void;
  stopCountdown: () => void;
  checkTimerCompletion: () => void;

  // Local storage methods for offline support
  saveTimersToStorage: () => Promise<void>;
  loadTimersFromStorage: () => Promise<Timer[]>;

  /** Schedule one alarm on device (permissions + native AlarmManager). */
  scheduleAlarmNative: (alarm: Alarm) => Promise<void>;
  reset: () => Promise<void>;
}

const inFlightAlarmDeletes = new Set<string>();

export const useAlarmStore = create<AlarmState>((set, get) => ({
  // Initial state
  alarms: [],
  timers: [],
  activeTimer: null,
  loading: false,
  error: null,
  lastSaveTime: null,
  countdownInterval: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  scheduleAlarmNative: async (alarm: Alarm) => {
    logger.info(
      `scheduleAlarmNative this is my alarm ${alarm.id} ${alarm.title} time: ${alarm.time} /${alarm.enabled} recurrenceRule: ${alarm.recurrenceRule} toneUrl:${alarm.toneUrl} timezone: ${alarm.timezone} ${alarm.createdAt} ${alarm.updatedAt}`,
    );
    console.log("alarm.enabled", alarm.enabled);
    if (!alarm.enabled) return;

    const { alarmPermissionService } =
      await import("@/services/AlarmPermissionService");
    const granted = await alarmPermissionService.requestAllPermissions();
    if (!granted) {
      logger.warn(
        "Alarm permissions incomplete; native schedule may not fire",
        { alarmId: alarm.id },
      );
    }

    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    try {
      const stoppedAlarms = await AsyncStorage.getItem("stopped_alarms");
      if (stoppedAlarms) {
        const stoppedSet = new Set<string>(JSON.parse(stoppedAlarms));
        if (stoppedSet.has(alarm.id)) {
          logger.info("Skipping native schedule — alarm marked stopped", {
            alarmId: alarm.id,
          });
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    logger.info(
      `alarm before scheduleAlarm ${alarm.id} ${alarm.title} time: ${alarm.time} /${alarm.enabled} recurrenceRule: ${alarm.recurrenceRule} toneUrl:${alarm.toneUrl} timezone: ${alarm.timezone} ${alarm.createdAt} ${alarm.updatedAt}`,
    );
    await reliableAlarmService.cancelAlarm(alarm.id).catch(() => {});
    await reliableAlarmService.scheduleAlarm(alarm);
  },

  // Alarm actions
  fetchAlarms: async (
    page = 1,
    limit = 20,
    enabled,
    retryCount = 0,
    options = {},
  ) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    const shouldScheduleNative = options.scheduleNative ?? true;

    try {
      set({ loading: true, error: null });

      const response = await alarmService.getAlarms(page, limit, enabled);

      const normalizedAlarms = response.data.map((alarm: Alarm) => ({
        ...alarm,
        time: new Date(alarm.time).toISOString(), // always UTC
        timezone: "UTC",
      }));

      logger.info("response.data:", normalizedAlarms);
      logger.info("response.data:", response.data);
      // CRITICAL: Merge backend data with local state to preserve:
      // 1. Locally-disabled alarms (prevent re-enabling if backend update failed)
      // 2. Locally-created snooze alarms (they don't exist in backend)
      const currentState = get();

      // Preserve all locally-created snooze alarms (they have IDs like `${id}_snooze_${timestamp}`)
      const localSnoozeAlarms = currentState.alarms.filter(
        (a) => a.id.includes("_snooze_") || a.id.endsWith("_snooze"),
      );

      const mergedAlarms = normalizedAlarms.map((backendAlarm: Alarm) => {
        // Find if this alarm exists in local state
        const localAlarm = currentState.alarms.find(
          (a) => a.id === backendAlarm.id,
        );

        if (localAlarm) {
          // If alarm exists locally and was locally disabled, preserve that state
          // This handles the case where backend update failed but we disabled it locally
          if (localAlarm.enabled === false && backendAlarm.enabled === true) {
            logger.info(
              `Preserving locally-disabled state for alarm: ${backendAlarm.title}`,
            );
            return { ...backendAlarm, enabled: false };
          }

          // CRITICAL: If alarm was snoozed locally (time is more recent than backend), preserve the snoozed time
          // This prevents fetchAlarms from overwriting the snoozed time with the old backend time
          const localTime = new Date(localAlarm.time).getTime();
          const backendTime = new Date(backendAlarm.time).getTime();
          const now = Date.now();

          // If local time is in the future and more recent than backend time, it's likely a snooze
          // Only preserve if local time is within the next hour (to avoid preserving very old times)
          if (
            localTime > now &&
            localTime > backendTime &&
            localTime < now + 3600000
          ) {
            logger.info(
              `Preserving snoozed time for alarm: ${backendAlarm.title}`,
            );
            return {
              ...backendAlarm,
              time: localAlarm.time,
              updatedAt: localAlarm.updatedAt || backendAlarm.updatedAt,
            };
          }
        }

        return backendAlarm;
      });

      // Add back only ACTIVE (enabled, future time) local snooze alarms
      // Remove snooze alarms that have already passed or are disabled
      const now = Date.now();
      const activeSnoozeAlarms = localSnoozeAlarms.filter((snoozeAlarm) => {
        if (!snoozeAlarm.enabled) return false;
        const snoozeTime = new Date(snoozeAlarm.time).getTime();
        // Keep snooze alarms that are more than 30 seconds in the future
        // This removes past snooze alarms that should have fired already
        return snoozeTime > now + 30000;
      });

      if (activeSnoozeAlarms.length < localSnoozeAlarms.length) {
        logger.info(
          `Removed ${localSnoozeAlarms.length - activeSnoozeAlarms.length} expired/disabled snooze alarms`,
        );
      }

      // here is the collected data with wrong timezone sent
      const allAlarms = [...mergedAlarms, ...activeSnoozeAlarms];
      logger.info(`allAlarms:`, allAlarms);
      set({
        alarms: allAlarms,
        pagination: response.pagination,
        loading: false,
      });

      // const x = get();
      // logger.info(`Current state alarms:`, x.alarms);

      if (!shouldScheduleNative) return;

      // NOTE: DO NOT call notificationService.scheduleAllAlarms() - it's for legacy JS alarms only
      // All alarms are scheduled via reliableAlarmService below (native Android AlarmManager)

      // CRITICAL: Cancel alarms that are no longer enabled or no longer in the list
      // This prevents orphaned alarms from firing
      logger.info("Cleaning up alarms that should be cancelled");
      const currentAlarmIds = new Set(allAlarms.map((a) => a.id));
      const alarmsToCancel: string[] = [];

      for (const alarm of currentState.alarms) {
        // Cancel if:
        // 1. Alarm is not in the new list (was deleted)
        // 2. Alarm is disabled in the new list
        const newAlarm = allAlarms.find((a) => a.id === alarm.id);
        if (!currentAlarmIds.has(alarm.id) || (newAlarm && !newAlarm.enabled)) {
          alarmsToCancel.push(alarm.id);
        }
      }

      // Cancel orphaned/disabled alarms in parallel
      await Promise.allSettled(
        alarmsToCancel.map(async (alarmId) => {
          try {
            await reliableAlarmService.cancelAlarm(alarmId);
            logger.info(`Cancelled alarm: ${alarmId}`);
          } catch (error) {
            logger.warn(`Failed to cancel alarm ${alarmId}`, error);
          }
        }),
      );

      // Schedule all enabled alarms using native Android AlarmManager
      // BUT: Skip scheduling alarms that are in the past (for one-time alarms)
      // This prevents re-scheduling alarms that were already stopped
      // Include both merged alarms (from backend) and local snooze alarms
      // Note: 'now' is already declared above (line 108)

      // CRITICAL: Check AsyncStorage for stopped alarms to prevent re-scheduling
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      let stoppedAlarmsSet = new Set<string>();
      try {
        const stoppedAlarms = await AsyncStorage.getItem("stopped_alarms");
        if (stoppedAlarms) {
          stoppedAlarmsSet = new Set(JSON.parse(stoppedAlarms));
          logger.info(
            `Found ${stoppedAlarmsSet.size} stopped alarms in AsyncStorage`,
          );
        }
      } catch (error) {
        logger.warn("Failed to read stopped alarms from AsyncStorage", error);
      }
      const res = await apiClient.get<{
        success: boolean;
        data: any;
      }>("/me/notification-settings");

      const notificationSettings = res.data;

      const enabledAlarms = allAlarms.filter((a) => {
        if (!a.enabled) return false;
        if (!notificationSettings?.pushNotifications) return false;

        // CRITICAL: Skip alarms that are marked as stopped in AsyncStorage
        if (stoppedAlarmsSet.has(a.id)) {
          logger.info(`Skipping stopped alarm: ${a.title}`);
          return false;
        }

        // Check if this alarm was recently stopped (within last 5 minutes)
        // This prevents re-scheduling alarms that were just stopped
        // We check both the alarm ID and any snooze alarm patterns
        const wasRecentlyStopped = currentState.alarms.find((localAlarm) => {
          if (localAlarm.id === a.id) {
            // Check if there's a stopped marker in the stoppedAlarmsThisOccurrence (from AlarmsScreen)
            // Since we can't access that directly, we check if the alarm is disabled locally
            // and enabled on backend (indicates it was stopped)
            return localAlarm.enabled === false && a.enabled === true;
          }
          return false;
        });

        if (wasRecentlyStopped) {
          logger.info(`Skipping recently-stopped alarm: ${a.title}`);
          return false;
        }

        // For one-time alarms (including snooze alarms), only schedule if time is in the future
        const isOneTime = !a.recurrenceRule || a.recurrenceRule === "none";
        if (isOneTime) {
          const alarmTime = new Date(a.time).getTime();
          // For snooze alarms, use 10 seconds buffer (they're more precise)
          // For regular one-time alarms, use 30 seconds buffer
          const isSnoozeAlarm =
            a.id.includes("_snooze_") || a.id.endsWith("_snooze");
          const buffer = isSnoozeAlarm ? 10000 : 30000; // 10s for snooze, 30s for regular
          const isFuture = alarmTime > now + buffer;
          if (!isFuture) {
            logger.info(`Skipping past one-time alarm: ${a.title}`);
            return false;
          }
        }

        return true;
      });

      logger.info(`Scheduling ${enabledAlarms.length} enabled alarms natively`);
      // Schedule alarms one at a time to avoid race conditions
      // Cancel each alarm before re-scheduling to prevent duplicates
      for (const alarm of enabledAlarms) {
        try {
          // Always cancel first to prevent duplicate scheduling
          // This is critical because fetchAlarms can be called multiple times
          await reliableAlarmService.cancelAlarm(alarm.id).catch(() => {
            // Ignore errors if alarm doesn't exist - that's fine
          });

          logger.info(`Scheduling alarm: ${alarm.title}`);
          await reliableAlarmService.scheduleAlarm(alarm);
          logger.info(`Successfully scheduled: ${alarm.title}`);
        } catch (error) {
          logger.error(
            `Failed to schedule native alarm ${alarm.id} (${alarm.title})`,
            error,
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch alarms";
      const isNetworkError =
        errorMessage.includes("Network connection failed") ||
        errorMessage.includes("Network Error") ||
        (error as any)?.code === "NETWORK_ERROR";

      // Retry on network errors
      if (isNetworkError && retryCount < maxRetries) {
        logger.warn(
          `Network error fetching alarms, retrying... (${retryCount + 1}/${maxRetries})`,
        );
        await new Promise<void>((resolve) =>
          setTimeout(() => resolve(), retryDelay * (retryCount + 1)),
        );
        return get().fetchAlarms(page, limit, enabled, retryCount + 1, options);
      }

      set({
        error: errorMessage,
        loading: false,
      });

      // Don't throw - allow app to continue even if alarm fetch fails
      logger.error("Failed to fetch alarms after retries:", error);
    }
  },

  fetchTimers: async (page = 1, limit = 20) => {
    try {
      set({ loading: true, error: null });

      // Try to fetch from server first
      try {
        const response = await alarmService.getTimers(page, limit);
        logger.info(`🔍 Fetched ${response.data} timers from server`);
        set({
          timers: response.data,
          pagination: response.pagination,
          loading: false,
        });
      } catch (serverError) {
        // Load from local storage or create default timers
        const storedTimers = await get().loadTimersFromStorage();
        logger.info(`🔍 Loaded ${storedTimers} timers from local storage`);
        const localTimers =
          storedTimers.length > 0
            ? storedTimers
            : [
                {
                  id: "default_pomodoro",
                  title: "Pomodoro Timer",
                  duration: 25,
                  remainingTime: 25 * 60,
                  isRunning: false,
                  isPaused: false,
                  isCompleted: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  userId: "local",
                },
              ];

        set({
          timers: localTimers,
          pagination: {
            page: 1,
            limit: 20,
            total: localTimers.length,
            totalPages: 1,
          },
          loading: false,
        });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch timers",
        loading: false,
      });
    }
  },

  createAlarm: async (data) => {
    try {
      set({ loading: true, error: null });
      const alarm = await alarmService.createAlarm(data);
      set((state) => ({
        alarms: [alarm, ...state.alarms],
        loading: false,
      }));

      if (alarm.enabled) {
        try {
          await get().scheduleAlarmNative(alarm);
        } catch (scheduleError) {
          const detail =
            scheduleError instanceof Error
              ? scheduleError.message
              : "Could not schedule on device";
          logger.warn("Alarm saved but native schedule failed", {
            alarmId: alarm.id,
            detail,
          });
          throw new AlarmScheduleWarning(alarm, detail);
        }
      }

      const alarmSource =
        consumePendingAnalytics("alarmCreateSource") || "manual";
      track(AnalyticsEvents.ALARM_CREATED, { source: alarmSource });
      if (alarmSource === "calendar") {
        track(AnalyticsEvents.CALENDAR_EVENT_CREATED, { entity: "alarm" });
      }
      return alarm;
    } catch (error) {
      if (error instanceof AlarmScheduleWarning) {
        const alarmSource =
          consumePendingAnalytics("alarmCreateSource") || "manual";
        track(AnalyticsEvents.ALARM_CREATED, { source: alarmSource });
        if (alarmSource === "calendar") {
          track(AnalyticsEvents.CALENDAR_EVENT_CREATED, { entity: "alarm" });
        }
      } else {
        trackFailure(AnalyticsEvents.ALARM_CREATION_FAILED, error);
      }
      set({
        error:
          error instanceof Error ? error.message : "Failed to create alarm",
        loading: false,
      });
      throw error;
    }
  },

  updateAlarm: async (id, data) => {
    try {
      set({ loading: true, error: null });
      const alarm = await alarmService.updateAlarm(id, data);
      set((state) => ({
        alarms: state.alarms.map((a) => (a.id === id ? alarm : a)),
        loading: false,
      }));

      // CRITICAL: If alarm is re-enabled, remove from stopped alarms list
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      if (alarm.enabled) {
        try {
          const stoppedAlarms = await AsyncStorage.getItem("stopped_alarms");
          if (stoppedAlarms) {
            const stoppedSet = new Set(JSON.parse(stoppedAlarms));
            stoppedSet.delete(id);
            await AsyncStorage.setItem(
              "stopped_alarms",
              JSON.stringify(Array.from(stoppedSet)),
            );
            logger.info("Removed alarm from stopped list (re-enabled)", id);
          }
        } catch (error) {
          logger.warn("Failed to remove alarm from stopped list", error);
        }
      }

      await reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error("Failed to cancel native alarm", error);
      });
      if (alarm.enabled) {
        await get().scheduleAlarmNative(alarm);
      }

      track(AnalyticsEvents.ALARM_UPDATED);
      return alarm;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update alarm",
        loading: false,
      });
      throw error;
    }
  },

  deleteAlarm: async (id) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (inFlightAlarmDeletes.has(id)) {
      logger.info(
        `Delete already in progress for alarm ${id}, skipping duplicate request`,
      );
      return;
    }

    if (!isAuthenticated) {
      // Update store locally and ensure the scheduled notification is removed
      set((state) => ({
        alarms: state.alarms.filter((a) => a.id !== id),
        loading: false,
      }));
      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error("Failed to cancel native alarm", error);
      });
      return;
    }

    inFlightAlarmDeletes.add(id);

    // CRITICAL: Remove from stopped alarms list when deleting
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    try {
      const stoppedAlarms = await AsyncStorage.getItem("stopped_alarms");
      if (stoppedAlarms) {
        const stoppedSet = new Set(JSON.parse(stoppedAlarms));
        stoppedSet.delete(id);
        await AsyncStorage.setItem(
          "stopped_alarms",
          JSON.stringify(Array.from(stoppedSet)),
        );
        logger.info("Removed alarm from stopped list (deleted)", id);
      }
    } catch (error) {
      logger.warn("Failed to remove alarm from stopped list", error);
    }

    try {
      set({ loading: true, error: null });
      await alarmService.deleteAlarm(id);
      set((state) => ({
        alarms: state.alarms.filter((a) => a.id !== id),
        loading: false,
      }));

      // Cancel the scheduled alarm
      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error("Failed to cancel native alarm", error);
      });
      track(AnalyticsEvents.ALARM_DELETED);
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete alarm",
        loading: false,
      });
      throw error;
    } finally {
      inFlightAlarmDeletes.delete(id);
    }
  },

  toggleAlarm: async (id) => {
    try {
      const alarm = get().alarms.find((a) => a.id === id);
      if (!alarm) return;

      // Update local state immediately for better UX
      const newEnabledState = !alarm.enabled;
      set((state) => ({
        alarms: state.alarms.map((a) =>
          a.id === id ? { ...a, enabled: newEnabledState } : a,
        ),
      }));

      // CRITICAL: Manage stopped alarms list
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      try {
        const stoppedAlarms = await AsyncStorage.getItem("stopped_alarms");
        const stoppedSet = stoppedAlarms
          ? new Set(JSON.parse(stoppedAlarms))
          : new Set<string>();

        if (newEnabledState) {
          // Re-enabling: Remove from stopped list
          stoppedSet.delete(id);
          await AsyncStorage.setItem(
            "stopped_alarms",
            JSON.stringify(Array.from(stoppedSet)),
          );
          logger.info("Removed alarm from stopped list (toggled on)", id);
        } else {
          // Disabling: Add to stopped list
          stoppedSet.add(id);
          await AsyncStorage.setItem(
            "stopped_alarms",
            JSON.stringify(Array.from(stoppedSet)),
          );
          logger.info("Added alarm to stopped list (toggled off)", id);
        }
      } catch (error) {
        logger.warn("Failed to update stopped alarms list", error);
      }

      // Cancel or schedule alarm immediately based on new state
      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error("Failed to cancel native alarm", error);
      });

      if (newEnabledState) {
        const toSchedule = get().alarms.find((a) => a.id === id);
        if (toSchedule) {
          await get().scheduleAlarmNative(toSchedule);
        }
      }

      // Update backend (non-blocking - local state already updated)
      try {
        const updatedAlarm = await alarmService.updateAlarm(id, {
          enabled: newEnabledState,
        });
        // Sync with backend response (in case backend has different state)
        set((state) => ({
          alarms: state.alarms.map((a) => (a.id === id ? updatedAlarm : a)),
        }));
      } catch (error) {
        logger.error("Failed to sync toggle with backend", error);
        // Keep local state - user's action should be respected even if backend fails
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to toggle alarm",
      });
    }
  },

  snoozeAlarm: async (id, duration = 5) => {
    try {
      const alarm = get().alarms.find((a) => a.id === id);
      if (!alarm) {
        logger.warn(`Alarm ${id} not found for snooze`);
        return;
      }

      logger.info(`Snoozing alarm ${id} for ${duration} minutes`);

      // CRITICAL NEW ARCHITECTURE: Snooze = reschedule SAME alarm ID
      // This prevents sound channel conflicts and ID duplication
      // Android owns the alarm ringing, JS only updates the time

      const now = Date.now();
      const snoozeTime = new Date(now + duration * 60 * 1000);

      logger.info(`Snooze alarm will ring at: ${snoozeTime.toISOString()}`);

      // Use native snooze method (reschedules same alarm ID)
      const { nativeAlarmBridge } =
        await import("@/services/NativeAlarmBridge");

      // CRITICAL: Remove alarm from stopped list if it was marked as stopped
      // This ensures the snoozed alarm can be scheduled
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      try {
        const stoppedAlarms = await AsyncStorage.getItem("stopped_alarms");
        if (stoppedAlarms) {
          const stoppedSet = new Set(JSON.parse(stoppedAlarms));
          if (stoppedSet.has(id)) {
            stoppedSet.delete(id);
            await AsyncStorage.setItem(
              "stopped_alarms",
              JSON.stringify(Array.from(stoppedSet)),
            );
            logger.info(`Removed alarm ${id} from stopped list for snooze`);
          }
        }
      } catch (error) {
        logger.warn("Failed to remove alarm from stopped list", error);
      }

      // CRITICAL: Stop the currently playing alarm sound/vibration first
      // This stops AlarmPlayerService if it's ringing
      await nativeAlarmBridge.stopPlayingAlarm().catch(() => {
        // Ignore errors if alarm service is not running
      });

      // CRITICAL: Cancel the current scheduled alarm first to ensure clean reschedule
      await nativeAlarmBridge.cancelAlarm(id).catch(() => {
        // Ignore errors if alarm doesn't exist
      });

      // Reschedule the alarm with new time (same ID)
      await nativeAlarmBridge.snoozeAlarm(
        id, // SAME alarm ID (critical!)
        duration,
        alarm.title,
        alarm.toneUrl || null,
        null, // Snooze is always one-time (no recurrence)
      );

      // Update alarm time in local store (UI needs to show new time)
      const updatedAlarm = {
        ...alarm,
        time: snoozeTime.toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: true, // Ensure alarm is enabled after snooze
      };

      set((state) => ({
        alarms: state.alarms.map((a) => (a.id === id ? updatedAlarm : a)),
      }));

      logger.info(`Alarm ${id} snoozed successfully`);

      // CRITICAL: The alarm is already scheduled natively via nativeAlarmBridge.snoozeAlarm() above
      // We don't need to re-fetch from backend because:
      // 1. It would overwrite the snoozed time with the old backend time
      // 2. The native scheduling is already done
      // 3. The store is already updated with the new time
      //
      // The merge logic in fetchAlarms will preserve the snoozed time if it's more recent than backend
      logger.info(`Alarm ${id} snoozed and rescheduled natively`);

      track(AnalyticsEvents.ALARM_SNOOZED, { durationMin: duration });

      // If authenticated, sync snooze to backend (non-blocking)
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        alarmService.snoozeAlarm(id, duration).catch((error) => {
          logger.warn("Failed to sync snooze to backend (non-critical)", error);
        });
      }
    } catch (error) {
      logger.error("Failed to snooze alarm", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to snooze alarm",
      });
      throw error; // Re-throw so UI can handle it
    }
  },

  dismissAlarm: async (id) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error("Failed to cancel native alarm", error);
      });
      return;
    }

    try {
      await alarmService.dismissAlarm(id);
      track(AnalyticsEvents.ALARM_DISMISSED);
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to dismiss alarm",
      });
    }
  },

  cleanupExpiredAlarms: async () => {
    const now = Date.now();
    const expired = get().alarms.filter((a) => {
      const isOneTime = !a.recurrenceRule || a.recurrenceRule === "none";
      if (!isOneTime) return false;
      // Skip locally-created snooze alarms — they don't exist in the backend
      // and are already pruned by fetchAlarms.
      if (a.id.includes("_snooze_") || a.id.endsWith("_snooze")) return false;
      return new Date(a.time).getTime() < now - 60_000;
    });

    if (expired.length === 0) return;

    logger.info(`🧹 Cleaning up ${expired.length} expired one-time alarm(s)`);
    await Promise.allSettled(expired.map((a) => get().deleteAlarm(a.id)));
  },

  // Timer actions
  createTimer: async (data) => {
    try {
      set({ loading: true, error: null });

      // Create timer locally first for immediate UI response
      const localTimer: Timer = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: data.title,
        duration: data.duration,
        remainingTime: data.duration * 60, // convert minutes to seconds
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "local", // Will be updated when synced
      };

      set((state) => ({
        timers: [localTimer, ...state.timers],
        loading: false,
      }));

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background (don't wait for it)
      try {
        const serverTimer = await alarmService.createTimer(data);
        set((state) => ({
          timers: state.timers.map((t) =>
            t.id === localTimer.id
              ? { ...serverTimer, remainingTime: localTimer.remainingTime }
              : t,
          ),
        }));
      } catch (syncError) {
        logger.warn("Timer sync failed, using local version", syncError);
        // Keep using local timer
      }

      return localTimer;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create timer",
        loading: false,
      });
      throw error;
    }
  },

  updateTimer: async (id, data) => {
    try {
      set({ loading: true, error: null });

      // Update timer locally first
      const currentTimer = get().timers.find((t) => t.id === id);
      if (!currentTimer) {
        throw new Error("Timer not found");
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer:
          state.activeTimer?.id === id ? updatedTimer : state.activeTimer,
        loading: false,
      }));

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background
      if (!id.startsWith("local_")) {
        try {
          const serverTimer = await alarmService.updateTimer(id, data);
          set((state) => ({
            timers: state.timers.map((t) =>
              t.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : t,
            ),
            activeTimer:
              state.activeTimer?.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : state.activeTimer,
          }));
        } catch (syncError) {
          logger.warn(
            "Timer update sync failed, using local version",
            syncError,
          );
        }
      }

      return updatedTimer;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update timer",
        loading: false,
      });
      throw error;
    }
  },

  deleteTimer: async (id) => {
    try {
      set({ loading: true, error: null });

      // Remove timer locally first
      set((state) => ({
        timers: state.timers.filter((t) => t.id !== id),
        activeTimer: state.activeTimer?.id === id ? null : state.activeTimer,
        loading: false,
      }));

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background
      if (!id.startsWith("local_")) {
        try {
          await alarmService.deleteTimer(id);
        } catch (syncError) {
          logger.warn(
            "Timer delete sync failed, already removed locally",
            syncError,
          );
        }
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete timer",
        loading: false,
      });
      throw error;
    }
  },

  startTimer: async (id) => {
    try {
      // Update timer locally first
      const currentTimer = get().timers.find((t) => t.id === id);
      if (!currentTimer) {
        throw new Error("Timer not found");
      }

      // Stop any other running timers
      set((state) => ({
        timers: state.timers.map((t) =>
          t.id !== id && t.isRunning
            ? { ...t, isRunning: false, isPaused: false }
            : t,
        ),
        activeTimer: null,
      }));

      const updatedTimer: Timer = {
        ...currentTimer,
        isRunning: true,
        isPaused: false,
        isCompleted: false,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer: updatedTimer,
      }));

      // Schedule notification for timer completion (for background execution)
      notificationService.scheduleTimer(
        updatedTimer.id,
        updatedTimer.title,
        updatedTimer.remainingTime,
      );

      // Start countdown
      get().startCountdown();

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background
      if (!id.startsWith("local_")) {
        try {
          const serverTimer = await alarmService.startTimer(id);
          set((state) => ({
            timers: state.timers.map((t) =>
              t.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : t,
            ),
            activeTimer: {
              ...serverTimer,
              remainingTime: updatedTimer.remainingTime,
            },
          }));
        } catch (syncError) {
          logger.warn(
            "Timer start sync failed, using local version",
            syncError,
          );
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to start timer",
      });
    }
  },

  pauseTimer: async (id) => {
    try {
      // Update timer locally first
      const currentTimer = get().timers.find((t) => t.id === id);
      if (!currentTimer) {
        throw new Error("Timer not found");
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        isRunning: false,
        isPaused: true,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer:
          state.activeTimer?.id === id ? updatedTimer : state.activeTimer,
      }));

      // Cancel scheduled notification when pausing
      notificationService.cancelTimer(id);

      // Stop countdown when pausing
      get().stopCountdown();

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background
      if (!id.startsWith("local_")) {
        try {
          const serverTimer = await alarmService.pauseTimer(id);
          set((state) => ({
            timers: state.timers.map((t) =>
              t.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : t,
            ),
            activeTimer:
              state.activeTimer?.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : state.activeTimer,
          }));
        } catch (syncError) {
          logger.warn(
            "Timer pause sync failed, using local version",
            syncError,
          );
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to pause timer",
      });
    }
  },

  stopTimer: async (id) => {
    try {
      // Update timer locally first
      const currentTimer = get().timers.find((t) => t.id === id);
      if (!currentTimer) {
        throw new Error("Timer not found");
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        isRunning: false,
        isPaused: false,
        isCompleted: true,
        remainingTime: 0,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer: state.activeTimer?.id === id ? null : state.activeTimer,
      }));

      // Cancel scheduled notification when stopping
      notificationService.cancelTimer(id);

      // Stop countdown when stopping
      get().stopCountdown();

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background
      if (!id.startsWith("local_")) {
        try {
          const serverTimer = await alarmService.stopTimer(id);
          set((state) => ({
            timers: state.timers.map((t) =>
              t.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : t,
            ),
          }));
        } catch (syncError) {
          logger.warn("Timer stop sync failed, using local version", syncError);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to stop timer",
      });
    }
  },

  resetTimer: async (id) => {
    try {
      // Update timer locally first
      const currentTimer = get().timers.find((t) => t.id === id);
      if (!currentTimer) {
        throw new Error("Timer not found");
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        remainingTime: currentTimer.duration * 60, // reset to original duration
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer:
          state.activeTimer?.id === id ? updatedTimer : state.activeTimer,
      }));

      // Stop countdown when resetting
      get().stopCountdown();

      // Save to local storage (async)
      get()
        .saveTimersToStorage()
        .catch((err) => logger.warn("Failed to save timers", err));

      // Try to sync with backend in background
      if (!id.startsWith("local_")) {
        try {
          const serverTimer = await alarmService.resetTimer(id);
          set((state) => ({
            timers: state.timers.map((t) =>
              t.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : t,
            ),
            activeTimer:
              state.activeTimer?.id === id
                ? { ...serverTimer, remainingTime: updatedTimer.remainingTime }
                : state.activeTimer,
          }));
        } catch (syncError) {
          logger.warn(
            "Timer reset sync failed, using local version",
            syncError,
          );
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to reset timer",
      });
    }
  },

  setActiveTimer: (timer) => {
    set({ activeTimer: timer });
  },

  updateTimerRemainingTime: (id, remainingTime) => {
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === id ? { ...t, remainingTime } : t,
      ),
      activeTimer:
        state.activeTimer?.id === id
          ? { ...state.activeTimer, remainingTime }
          : state.activeTimer,
    }));

    // Save to local storage (throttled to avoid too frequent saves)
    const now = Date.now();
    const lastSaveTime = get().lastSaveTime;
    if (!lastSaveTime || now - lastSaveTime > 1000) {
      // Save max once per second
      get().saveTimersToStorage();
      set({ lastSaveTime: now });
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (loading) => set({ loading }),

  // Timer countdown methods
  startCountdown: () => {
    const { countdownInterval } = get();

    // Clear existing interval if any
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    // Start new countdown interval
    const interval = setInterval(() => {
      const { activeTimer } = get();

      if (
        activeTimer &&
        activeTimer.isRunning &&
        activeTimer.remainingTime > 0
      ) {
        // Decrease remaining time by 1 second
        const newRemainingTime = activeTimer.remainingTime - 1;
        get().updateTimerRemainingTime(activeTimer.id, newRemainingTime);

        // Check if timer is completed
        if (newRemainingTime <= 0) {
          get().checkTimerCompletion();
        }
      } else if (!activeTimer || !activeTimer.isRunning) {
        // Stop countdown if no active timer or timer is not running
        get().stopCountdown();
      }
    }, 1000);

    set({ countdownInterval: interval });
  },

  stopCountdown: () => {
    const { countdownInterval } = get();
    if (countdownInterval) {
      clearInterval(countdownInterval);
      set({ countdownInterval: null });
    }
  },

  checkTimerCompletion: () => {
    const { activeTimer } = get();
    if (activeTimer && activeTimer.remainingTime <= 0) {
      // Timer completed - trigger completion notification
      logger.info("Timer completed in store", activeTimer.id);

      // Trigger immediate notification with sound/vibration
      const { notificationService } = require("@/services/notificationService");
      notificationService.triggerImmediateTimerNotification({
        id: activeTimer.id,
        title: activeTimer.title,
      });

      // Stop the timer
      get().stopTimer(activeTimer.id);
    }
  },

  // Local storage methods for offline support - using AsyncStorage for React Native
  saveTimersToStorage: async () => {
    try {
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      const timers = get().timers;
      const timersWithStartTime = timers.map((t) => ({
        ...t,
        // Save start time if timer is running
        _startTime: t.isRunning && !t.isPaused ? Date.now() : null,
        _pausedTime: t.isPaused ? Date.now() : null,
      }));
      await AsyncStorage.setItem(
        "offline_timers",
        JSON.stringify(timersWithStartTime),
      );
    } catch (error) {
      logger.warn("Failed to save timers to storage", error);
    }
  },

  loadTimersFromStorage: async () => {
    try {
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      const stored = await AsyncStorage.getItem("offline_timers");
      if (stored) {
        const timers = JSON.parse(stored);

        // Recalculate remaining time for running timers based on start time
        const now = Date.now();
        const recalculatedTimers = timers.map((t: any) => {
          if (t.isRunning && !t.isPaused && t._startTime) {
            const elapsed = Math.floor((now - t._startTime) / 1000);
            const newRemaining = Math.max(
              0,
              (t.remainingTime || t.duration * 60) - elapsed,
            );
            return {
              ...t,
              remainingTime: newRemaining,
              isRunning: newRemaining > 0, // Stop if completed
              isCompleted: newRemaining <= 0,
            };
          }
          return t;
        });

        set({ timers: recalculatedTimers });
        return recalculatedTimers;
      }
    } catch (error) {
      logger.warn("Failed to load timers from storage", error);
    }
    return [];
  },

  reset: async () => {
    set({
      alarms: [],
      timers: [],
      activeTimer: null,
      loading: false,
      error: null,
      countdownInterval: null,
      lastSaveTime: null,
    });
  },
}));
