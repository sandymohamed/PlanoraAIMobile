import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alarm, CreateAlarmData, UpdateAlarmData, Timer, CreateTimerData, UpdateTimerData } from '@/types/alarm';
import { alarmService } from '@/services/alarmApiService';
import { notificationService } from '@/services/notificationService';
import { reliableAlarmService } from '@/services/ReliableAlarmService';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/utils/logger';
import { AlarmScheduleWarning } from '@/utils/alarmErrors';
import { track, trackFailure, AnalyticsEvents } from '@/analytics/posthog';
import { consumePendingAnalytics } from '@/analytics/pendingContext';
import { CACHE_CONFIG } from './types/storeWithCache';

interface AlarmState {
  // State
  alarms: Alarm[];
  timers: Timer[];
  activeTimer: Timer | null;
  loading: boolean;
  isLoaded: boolean;
  lastFetched: string | null;
  error: string | null;
  lastSaveTime: number | null;
  countdownInterval: ReturnType<typeof setInterval> | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Cache management
  needsRefresh: (maxAgeMinutes?: number) => boolean;
  markStale: () => void;

  // Actions
  fetchAlarms: (
    page?: number,
    limit?: number,
    enabled?: boolean,
    retryCount?: number,
    options?: { scheduleNative?: boolean; force?: boolean }
  ) => Promise<void>;
  fetchTimers: (page?: number, limit?: number) => Promise<void>;
  createAlarm: (data: CreateAlarmData) => Promise<Alarm>;
  updateAlarm: (id: string, data: UpdateAlarmData) => Promise<Alarm>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  snoozeAlarm: (id: string, duration?: number) => Promise<void>;
  dismissAlarm: (id: string) => Promise<void>;
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

  scheduleAlarmNative: (alarm: Alarm) => Promise<void>;
}

const inFlightAlarmDeletes = new Set<string>();

export const useAlarmStore = create<AlarmState>((set, get) => ({
  // Initial state
  alarms: [],
  timers: [],
  activeTimer: null,
  loading: false,
  isLoaded: false,
  lastFetched: null,
  error: null,
  lastSaveTime: null,
  countdownInterval: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  // Cache management
  needsRefresh: (maxAgeMinutes: number = CACHE_CONFIG.ALARMS_MAX_AGE_MINUTES) => {
    const { lastFetched, isLoaded, loading } = get();
    if (loading) return false;
    if (!isLoaded) return true;
    if (!lastFetched) return true;
    const now = Date.now();
    const lastFetchTime = new Date(lastFetched).getTime();
    const ageInMinutes = (now - lastFetchTime) / (1000 * 60);
    return ageInMinutes > maxAgeMinutes;
  },

  markStale: () => {
    set({ lastFetched: null, isLoaded: false });
  },

  scheduleAlarmNative: async (alarm: Alarm) => {
    if (!alarm.enabled) return;

    const { alarmPermissionService } = await import('@/services/AlarmPermissionService');
    const granted = await alarmPermissionService.requestAllPermissions();
    if (!granted) {
      logger.warn('Alarm permissions incomplete; native schedule may not fire', { alarmId: alarm.id });
    }

    try {
      const stoppedAlarms = await AsyncStorage.getItem('stopped_alarms');
      if (stoppedAlarms) {
        const stoppedSet = new Set<string>(JSON.parse(stoppedAlarms));
        if (stoppedSet.has(alarm.id)) {
          logger.info('Skipping native schedule — alarm marked stopped', { alarmId: alarm.id });
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    await reliableAlarmService.cancelAlarm(alarm.id).catch(() => {});
    await reliableAlarmService.scheduleAlarm(alarm);
  },

  // Alarm actions with cache awareness
  fetchAlarms: async (page = 1, limit = 20, enabled?: boolean, retryCount = 0, options = {}) => {
    const maxRetries = 3;
    const retryDelay = 2000;
    const shouldScheduleNative = options.scheduleNative ?? true;
    const force = options.force ?? false;
    
    const { needsRefresh, isLoaded } = get();
    
    // Skip if cache is fresh and not forced
    if (!force && isLoaded && !needsRefresh()) {
      logger.info("Alarm cache is fresh, skipping fetch");
      return;
    }

    try {
      set({ loading: true, error: null });
      const response = await alarmService.getAlarms(page, limit, enabled);
      
      const currentState = get();
      
      const localSnoozeAlarms = currentState.alarms.filter(a => 
        a.id.includes('_snooze_') || a.id.endsWith('_snooze')
      );
      
      const mergedAlarms = response.data.map(backendAlarm => {
        const localAlarm = currentState.alarms.find(a => a.id === backendAlarm.id);
        
        if (localAlarm) {
          if (localAlarm.enabled === false && backendAlarm.enabled === true) {
            logger.info(`Preserving locally-disabled state for alarm: ${backendAlarm.title}`);
            return { ...backendAlarm, enabled: false };
          }
          
          const localTime = new Date(localAlarm.time).getTime();
          const backendTime = new Date(backendAlarm.time).getTime();
          const now = Date.now();
          
          if (localTime > now && localTime > backendTime && localTime < now + 3600000) {
            logger.info(`Preserving snoozed time for alarm: ${backendAlarm.title}`);
            return { 
              ...backendAlarm, 
              time: localAlarm.time,
              updatedAt: localAlarm.updatedAt || backendAlarm.updatedAt
            };
          }
        }
        
        return backendAlarm;
      });
      
      const now = Date.now();
      const activeSnoozeAlarms = localSnoozeAlarms.filter(snoozeAlarm => {
        if (!snoozeAlarm.enabled) return false;
        const snoozeTime = new Date(snoozeAlarm.time).getTime();
        return snoozeTime > now + 30000;
      });
      
      if (activeSnoozeAlarms.length < localSnoozeAlarms.length) {
        logger.info(`Removed ${localSnoozeAlarms.length - activeSnoozeAlarms.length} expired/disabled snooze alarms`);
      }
      
      const allAlarms = [...mergedAlarms, ...activeSnoozeAlarms];
      
      set({
        alarms: allAlarms,
        pagination: response.pagination,
        loading: false,
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      });

      if (!shouldScheduleNative) return;

      logger.info('Cleaning up alarms that should be cancelled');
      const currentAlarmIds = new Set(allAlarms.map(a => a.id));
      const alarmsToCancel: string[] = [];
      
      for (const alarm of currentState.alarms) {
        const newAlarm = allAlarms.find(a => a.id === alarm.id);
        if (!currentAlarmIds.has(alarm.id) || (newAlarm && !newAlarm.enabled)) {
          alarmsToCancel.push(alarm.id);
        }
      }
      
      await Promise.allSettled(
        alarmsToCancel.map(async (alarmId) => {
          try {
            await reliableAlarmService.cancelAlarm(alarmId);
            logger.info(`Cancelled alarm: ${alarmId}`);
          } catch (error) {
            logger.warn(`Failed to cancel alarm ${alarmId}`, error);
          }
        })
      );

      let stoppedAlarmsSet = new Set<string>();
      try {
        const stoppedAlarms = await AsyncStorage.getItem('stopped_alarms');
        if (stoppedAlarms) {
          stoppedAlarmsSet = new Set(JSON.parse(stoppedAlarms));
          logger.info(`Found ${stoppedAlarmsSet.size} stopped alarms in AsyncStorage`);
        }
      } catch (error) {
        logger.warn('Failed to read stopped alarms from AsyncStorage', error);
      }
      
      const enabledAlarms = allAlarms.filter(a => {
        if (!a.enabled) return false;
        
        if (stoppedAlarmsSet.has(a.id)) {
          logger.info(`Skipping stopped alarm: ${a.title}`);
          return false;
        }
        
        const wasRecentlyStopped = currentState.alarms.find(localAlarm => {
          if (localAlarm.id === a.id) {
            return localAlarm.enabled === false && a.enabled === true;
          }
          return false;
        });
        
        if (wasRecentlyStopped) {
          logger.info(`Skipping recently-stopped alarm: ${a.title}`);
          return false;
        }
        
        const isOneTime = !a.recurrenceRule || a.recurrenceRule === 'none';
        if (isOneTime) {
          const alarmTime = new Date(a.time).getTime();
          const isSnoozeAlarm = a.id.includes('_snooze_') || a.id.endsWith('_snooze');
          const buffer = isSnoozeAlarm ? 10000 : 30000;
          const isFuture = alarmTime > now + buffer;
          if (!isFuture) {
            logger.info(`Skipping past one-time alarm: ${a.title}`);
            return false;
          }
        }
        
        return true;
      });
      
      logger.info(`Scheduling ${enabledAlarms.length} enabled alarms natively`);
      for (const alarm of enabledAlarms) {
        try {
          await reliableAlarmService.cancelAlarm(alarm.id).catch(() => {});
          logger.info(`Scheduling alarm: ${alarm.title}`);
          await reliableAlarmService.scheduleAlarm(alarm);
          logger.info(`Successfully scheduled: ${alarm.title}`);
        } catch (error) {
          logger.error(`Failed to schedule native alarm ${alarm.id} (${alarm.title})`, error);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch alarms';
      const isNetworkError = errorMessage.includes('Network connection failed') || 
                            errorMessage.includes('Network Error') ||
                            (error as any)?.code === 'NETWORK_ERROR';
      
      if (isNetworkError && retryCount < maxRetries) {
        logger.warn(`Network error fetching alarms, retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise<void>(resolve => setTimeout(() => resolve(), retryDelay * (retryCount + 1)));
        return get().fetchAlarms(page, limit, enabled, retryCount + 1, options);
      }
      
      set({
        error: errorMessage,
        loading: false,
      });
      
      logger.error('Failed to fetch alarms after retries:', error);
    }
  },

  fetchTimers: async (page = 1, limit = 20) => {
    try {
      set({ loading: true, error: null });

      try {
        const response = await alarmService.getTimers(page, limit);
        logger.info(`🔍 Fetched ${response.data} timers from server`);
        set({
          timers: response.data,
          pagination: response.pagination,
          loading: false,
          isLoaded: true,
          lastFetched: new Date().toISOString(),
        });
      } catch (serverError) {
        const storedTimers = await get().loadTimersFromStorage();
        logger.info(`🔍 Loaded ${storedTimers} timers from local storage`);
        const localTimers = storedTimers.length > 0 ? storedTimers : [
          {
            id: 'default_pomodoro',
            title: 'Pomodoro Timer',
            duration: 25,
            remainingTime: 25 * 60,
            isRunning: false,
            isPaused: false,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'local',
          }
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
          isLoaded: true,
          lastFetched: new Date().toISOString(),
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch timers',
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
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      }));

      if (alarm.enabled) {
        try {
          await get().scheduleAlarmNative(alarm);
        } catch (scheduleError) {
          const detail =
            scheduleError instanceof Error ? scheduleError.message : 'Could not schedule on device';
          logger.warn('Alarm saved but native schedule failed', { alarmId: alarm.id, detail });
          throw new AlarmScheduleWarning(alarm, detail);
        }
      }

      const alarmSource = consumePendingAnalytics('alarmCreateSource') || 'manual';
      track(AnalyticsEvents.ALARM_CREATED, { source: alarmSource });
      if (alarmSource === 'calendar') {
        track(AnalyticsEvents.CALENDAR_EVENT_CREATED, { entity: 'alarm' });
      }
      return alarm;
    } catch (error) {
      if (error instanceof AlarmScheduleWarning) {
        const alarmSource = consumePendingAnalytics('alarmCreateSource') || 'manual';
        track(AnalyticsEvents.ALARM_CREATED, { source: alarmSource });
        if (alarmSource === 'calendar') {
          track(AnalyticsEvents.CALENDAR_EVENT_CREATED, { entity: 'alarm' });
        }
      } else {
        trackFailure(AnalyticsEvents.ALARM_CREATION_FAILED, error);
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to create alarm',
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
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      }));

      if (alarm.enabled) {
        try {
          const stoppedAlarms = await AsyncStorage.getItem('stopped_alarms');
          if (stoppedAlarms) {
            const stoppedSet = new Set(JSON.parse(stoppedAlarms));
            stoppedSet.delete(id);
            await AsyncStorage.setItem('stopped_alarms', JSON.stringify(Array.from(stoppedSet)));
            logger.info('Removed alarm from stopped list (re-enabled)', id);
          }
        } catch (error) {
          logger.warn('Failed to remove alarm from stopped list', error);
        }
      }

      await reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error('Failed to cancel native alarm', error);
      });
      if (alarm.enabled) {
        await get().scheduleAlarmNative(alarm);
      }

      track(AnalyticsEvents.ALARM_UPDATED);
      return alarm;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update alarm',
        loading: false,
      });
      throw error;
    }
  },

  deleteAlarm: async (id) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (inFlightAlarmDeletes.has(id)) {
      logger.info(`Delete already in progress for alarm ${id}, skipping duplicate request`);
      return;
    }

    if (!isAuthenticated) {
      set((state) => ({
        alarms: state.alarms.filter((a) => a.id !== id),
        loading: false,
      }));
      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error('Failed to cancel native alarm', error);
      });
      return;
    }

    inFlightAlarmDeletes.add(id);

    try {
      const stoppedAlarms = await AsyncStorage.getItem('stopped_alarms');
      if (stoppedAlarms) {
        const stoppedSet = new Set(JSON.parse(stoppedAlarms));
        stoppedSet.delete(id);
        await AsyncStorage.setItem('stopped_alarms', JSON.stringify(Array.from(stoppedSet)));
        logger.info('Removed alarm from stopped list (deleted)', id);
      }
    } catch (error) {
      logger.warn('Failed to remove alarm from stopped list', error);
    }

    try {
      set({ loading: true, error: null });
      await alarmService.deleteAlarm(id);
      set((state) => ({
        alarms: state.alarms.filter((a) => a.id !== id),
        loading: false,
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      }));

      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error('Failed to cancel native alarm', error);
      });
      track(AnalyticsEvents.ALARM_DELETED);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete alarm',
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

      const newEnabledState = !alarm.enabled;
      set((state) => ({
        alarms: state.alarms.map((a) => (a.id === id ? { ...a, enabled: newEnabledState } : a)),
      }));

      try {
        const stoppedAlarms = await AsyncStorage.getItem('stopped_alarms');
        const stoppedSet = stoppedAlarms ? new Set(JSON.parse(stoppedAlarms)) : new Set<string>();
        
        if (newEnabledState) {
          stoppedSet.delete(id);
          await AsyncStorage.setItem('stopped_alarms', JSON.stringify(Array.from(stoppedSet)));
          logger.info('Removed alarm from stopped list (toggled on)', id);
        } else {
          stoppedSet.add(id);
          await AsyncStorage.setItem('stopped_alarms', JSON.stringify(Array.from(stoppedSet)));
          logger.info('Added alarm to stopped list (toggled off)', id);
        }
      } catch (error) {
        logger.warn('Failed to update stopped alarms list', error);
      }

      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error('Failed to cancel native alarm', error);
      });
      
      if (newEnabledState) {
        const toSchedule = get().alarms.find((a) => a.id === id);
        if (toSchedule) {
          await get().scheduleAlarmNative(toSchedule);
        }
      }

      try {
        const updatedAlarm = await alarmService.updateAlarm(id, {
          enabled: newEnabledState,
        });
        set((state) => ({
          alarms: state.alarms.map((a) => (a.id === id ? updatedAlarm : a)),
          lastFetched: new Date().toISOString(),
        }));
      } catch (error) {
        logger.error('Failed to sync toggle with backend', error);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle alarm',
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
      
      const now = Date.now();
      const snoozeTime = new Date(now + (duration * 60 * 1000));
      
      logger.info(`Snooze alarm will ring at: ${snoozeTime.toISOString()}`);
      
      const { nativeAlarmBridge } = await import('@/services/NativeAlarmBridge');
      
      try {
        const stoppedAlarms = await AsyncStorage.getItem('stopped_alarms');
        if (stoppedAlarms) {
          const stoppedSet = new Set(JSON.parse(stoppedAlarms));
          if (stoppedSet.has(id)) {
            stoppedSet.delete(id);
            await AsyncStorage.setItem('stopped_alarms', JSON.stringify(Array.from(stoppedSet)));
            logger.info(`Removed alarm ${id} from stopped list for snooze`);
          }
        }
      } catch (error) {
        logger.warn('Failed to remove alarm from stopped list', error);
      }
      
      await nativeAlarmBridge.stopPlayingAlarm().catch(() => {});
      await nativeAlarmBridge.cancelAlarm(id).catch(() => {});
      
      await nativeAlarmBridge.snoozeAlarm(
        id,
        duration,
        alarm.title,
        alarm.toneUrl || null,
        null
      );
      
      const updatedAlarm = {
        ...alarm,
        time: snoozeTime.toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: true,
      };
      
      set((state) => ({
        alarms: state.alarms.map(a => 
          a.id === id ? updatedAlarm : a
        ),
        lastFetched: new Date().toISOString(),
      }));
      
      logger.info(`Alarm ${id} snoozed successfully`);

      track(AnalyticsEvents.ALARM_SNOOZED, { durationMin: duration });

      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        alarmService.snoozeAlarm(id, duration).catch((error) => {
          logger.warn('Failed to sync snooze to backend (non-critical)', error);
        });
      }
    } catch (error) {
      logger.error('Failed to snooze alarm', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to snooze alarm',
      });
      throw error;
    }
  },

  dismissAlarm: async (id) => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      reliableAlarmService.cancelAlarm(id).catch((error) => {
        logger.error('Failed to cancel native alarm', error);
      });
      return;
    }

    try {
      await alarmService.dismissAlarm(id);
      track(AnalyticsEvents.ALARM_DISMISSED);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to dismiss alarm',
      });
    }
  },

  cleanupExpiredAlarms: async () => {
    const now = Date.now();
    const expired = get().alarms.filter((a) => {
      const isOneTime = !a.recurrenceRule || a.recurrenceRule === 'none';
      if (!isOneTime) return false;
      if (a.id.includes('_snooze_') || a.id.endsWith('_snooze')) return false;
      return new Date(a.time).getTime() < now - 60000;
    });

    if (expired.length === 0) return;

    logger.info(`🧹 Cleaning up ${expired.length} expired one-time alarm(s)`);
    await Promise.allSettled(expired.map((a) => get().deleteAlarm(a.id)));
  },

  // Timer actions
  createTimer: async (data) => {
    try {
      set({ loading: true, error: null });

      const localTimer: Timer = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: data.title,
        duration: data.duration,
        remainingTime: data.duration * 60,
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'local',
      };

      set((state) => ({
        timers: [localTimer, ...state.timers],
        loading: false,
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      }));

      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      try {
        const serverTimer = await alarmService.createTimer(data);
        set((state) => ({
          timers: state.timers.map(t =>
            t.id === localTimer.id ? { ...serverTimer, remainingTime: localTimer.remainingTime } : t
          ),
        }));
      } catch (syncError) {
        logger.warn('Timer sync failed, using local version', syncError);
      }

      return localTimer;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create timer',
        loading: false,
      });
      throw error;
    }
  },

  updateTimer: async (id, data) => {
    try {
      set({ loading: true, error: null });

      const currentTimer = get().timers.find(t => t.id === id);
      if (!currentTimer) {
        throw new Error('Timer not found');
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer: state.activeTimer?.id === id ? updatedTimer : state.activeTimer,
        loading: false,
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      }));

      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      if (!id.startsWith('local_')) {
        try {
          const serverTimer = await alarmService.updateTimer(id, data);
          set((state) => ({
            timers: state.timers.map((t) => (t.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : t)),
            activeTimer: state.activeTimer?.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : state.activeTimer,
          }));
        } catch (syncError) {
          logger.warn('Timer update sync failed, using local version', syncError);
        }
      }

      return updatedTimer;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update timer',
        loading: false,
      });
      throw error;
    }
  },

  deleteTimer: async (id) => {
    try {
      set({ loading: true, error: null });

      set((state) => ({
        timers: state.timers.filter((t) => t.id !== id),
        activeTimer: state.activeTimer?.id === id ? null : state.activeTimer,
        loading: false,
        isLoaded: true,
        lastFetched: new Date().toISOString(),
      }));

      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      if (!id.startsWith('local_')) {
        try {
          await alarmService.deleteTimer(id);
        } catch (syncError) {
          logger.warn('Timer delete sync failed, already removed locally', syncError);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete timer',
        loading: false,
      });
      throw error;
    }
  },

  startTimer: async (id) => {
    try {
      const currentTimer = get().timers.find(t => t.id === id);
      if (!currentTimer) {
        throw new Error('Timer not found');
      }

      set((state) => ({
        timers: state.timers.map((t) =>
          t.id !== id && t.isRunning ? { ...t, isRunning: false, isPaused: false } : t
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
        lastFetched: new Date().toISOString(),
      }));

      notificationService.scheduleTimer(updatedTimer.id, updatedTimer.title, updatedTimer.remainingTime);
      get().startCountdown();
      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      if (!id.startsWith('local_')) {
        try {
          const serverTimer = await alarmService.startTimer(id);
          set((state) => ({
            timers: state.timers.map((t) => (t.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : t)),
            activeTimer: { ...serverTimer, remainingTime: updatedTimer.remainingTime },
          }));
        } catch (syncError) {
          logger.warn('Timer start sync failed, using local version', syncError);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start timer',
      });
    }
  },

  pauseTimer: async (id) => {
    try {
      const currentTimer = get().timers.find(t => t.id === id);
      if (!currentTimer) {
        throw new Error('Timer not found');
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        isRunning: false,
        isPaused: true,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer: state.activeTimer?.id === id ? updatedTimer : state.activeTimer,
        lastFetched: new Date().toISOString(),
      }));

      notificationService.cancelTimer(id);
      get().stopCountdown();
      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      if (!id.startsWith('local_')) {
        try {
          const serverTimer = await alarmService.pauseTimer(id);
          set((state) => ({
            timers: state.timers.map((t) => (t.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : t)),
            activeTimer: state.activeTimer?.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : state.activeTimer,
          }));
        } catch (syncError) {
          logger.warn('Timer pause sync failed, using local version', syncError);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to pause timer',
      });
    }
  },

  stopTimer: async (id) => {
    try {
      const currentTimer = get().timers.find(t => t.id === id);
      if (!currentTimer) {
        throw new Error('Timer not found');
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
        lastFetched: new Date().toISOString(),
      }));

      notificationService.cancelTimer(id);
      get().stopCountdown();
      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      if (!id.startsWith('local_')) {
        try {
          const serverTimer = await alarmService.stopTimer(id);
          set((state) => ({
            timers: state.timers.map((t) => (t.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : t)),
          }));
        } catch (syncError) {
          logger.warn('Timer stop sync failed, using local version', syncError);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to stop timer',
      });
    }
  },

  resetTimer: async (id) => {
    try {
      const currentTimer = get().timers.find(t => t.id === id);
      if (!currentTimer) {
        throw new Error('Timer not found');
      }

      const updatedTimer: Timer = {
        ...currentTimer,
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        remainingTime: currentTimer.duration * 60,
        updatedAt: new Date().toISOString(),
      };

      set((state) => ({
        timers: state.timers.map((t) => (t.id === id ? updatedTimer : t)),
        activeTimer: state.activeTimer?.id === id ? updatedTimer : state.activeTimer,
        lastFetched: new Date().toISOString(),
      }));

      get().stopCountdown();
      get().saveTimersToStorage().catch(err => logger.warn('Failed to save timers', err));

      if (!id.startsWith('local_')) {
        try {
          const serverTimer = await alarmService.resetTimer(id);
          set((state) => ({
            timers: state.timers.map((t) => (t.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : t)),
            activeTimer: state.activeTimer?.id === id ? { ...serverTimer, remainingTime: updatedTimer.remainingTime } : state.activeTimer,
          }));
        } catch (syncError) {
          logger.warn('Timer reset sync failed, using local version', syncError);
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reset timer',
      });
    }
  },

  setActiveTimer: (timer) => {
    set({ activeTimer: timer });
  },

  updateTimerRemainingTime: (id, remainingTime) => {
    set((state) => ({
      timers: state.timers.map((t) =>
        t.id === id ? { ...t, remainingTime } : t
      ),
      activeTimer: state.activeTimer?.id === id
        ? { ...state.activeTimer, remainingTime }
        : state.activeTimer,
    }));

    const now = Date.now();
    const lastSaveTime = get().lastSaveTime;
    if (!lastSaveTime || now - lastSaveTime > 1000) {
      get().saveTimersToStorage();
      set({ lastSaveTime: now });
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (loading) => set({ loading }),

  startCountdown: () => {
    const { countdownInterval } = get();

    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    const interval = setInterval(() => {
      const { activeTimer } = get();

      if (activeTimer && activeTimer.isRunning && activeTimer.remainingTime > 0) {
        const newRemainingTime = activeTimer.remainingTime - 1;
        get().updateTimerRemainingTime(activeTimer.id, newRemainingTime);

        if (newRemainingTime <= 0) {
          get().checkTimerCompletion();
        }
      } else if (!activeTimer || !activeTimer.isRunning) {
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
      logger.info('Timer completed in store', activeTimer.id);
      
      const { notificationService } = require('@/services/notificationService');
      notificationService.triggerImmediateTimerNotification({
        id: activeTimer.id,
        title: activeTimer.title,
      });

      get().stopTimer(activeTimer.id);
    }
  },

  saveTimersToStorage: async () => {
    try {
      const timers = get().timers;
      const timersWithStartTime = timers.map(t => ({
        ...t,
        _startTime: t.isRunning && !t.isPaused ? Date.now() : null,
        _pausedTime: t.isPaused ? Date.now() : null,
      }));
      await AsyncStorage.setItem('offline_timers', JSON.stringify(timersWithStartTime));
    } catch (error) {
      logger.warn('Failed to save timers to storage', error);
    }
  },

  loadTimersFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem('offline_timers');
      if (stored) {
        const timers = JSON.parse(stored);
        
        const now = Date.now();
        const recalculatedTimers = timers.map((t: any) => {
          if (t.isRunning && !t.isPaused && t._startTime) {
            const elapsed = Math.floor((now - t._startTime) / 1000);
            const newRemaining = Math.max(0, (t.remainingTime || t.duration * 60) - elapsed);
            return {
              ...t,
              remainingTime: newRemaining,
              isRunning: newRemaining > 0,
              isCompleted: newRemaining <= 0,
            };
          }
          return t;
        });
        
        set({ timers: recalculatedTimers });
        return recalculatedTimers;
      }
    } catch (error) {
      logger.warn('Failed to load timers from storage', error);
    }
    return [];
  },
}));