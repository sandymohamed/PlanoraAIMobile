import { logger } from "@/utils/logger";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { useGoalStore } from "@/store/goalStore";
import { useAlarmStore } from "@/store/alarmStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { AppState, AppStateStatus } from "react-native";

interface SyncOptions {
  force?: boolean;
  silent?: boolean;
  includeAlarms?: boolean;
}

class AppSyncService {
  private isInitialized = false;
  private isSyncing = false;
  private appState = AppState.currentState;
  private lastSyncTime = 0;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly SYNC_COOLDOWN_MS = 5000; // 5 seconds cooldown
  private readonly SYNC_DEBOUNCE_MS = 1000; // 1 second debounce

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (this.appState.match(/inactive|background/) && nextAppState === "active") {
        logger.info("App returned to foreground, checking for stale data");
        this.debouncedRefresh();
      }
      this.appState = nextAppState;
    });
  }

  private debouncedRefresh() {
    // Clear any pending timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    // Debounce the refresh
    this.syncTimeout = setTimeout(() => {
      this.refreshIfNeeded();
      this.syncTimeout = null;
    }, this.SYNC_DEBOUNCE_MS);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info("AppSync already initialized");
      return;
    }

    logger.info("Initializing AppSync...");
    this.isInitialized = true;

    await this.refreshIfNeeded();
  }

  async refreshIfNeeded(): Promise<void> {
    // Check cooldown
    const now = Date.now();
    if (now - this.lastSyncTime < this.SYNC_COOLDOWN_MS) {
      logger.info("Sync cooldown active, skipping");
      return;
    }

    if (this.isSyncing) {
      logger.info("Sync already in progress, skipping");
      return;
    }

    const taskStore = useTaskStore.getState();
    const goalStore = useGoalStore.getState();
    const alarmStore = useAlarmStore.getState();

    const needsRefresh = 
      (taskStore.needsRefresh && taskStore.needsRefresh()) ||
      (goalStore.needsRefresh && goalStore.needsRefresh()) ||
      (alarmStore.needsRefresh && alarmStore.needsRefresh());

    if (needsRefresh) {
      logger.info("Cache expired, refreshing data...");
      await this.refreshAll({ force: false, silent: true });
    } else {
      logger.info("Cache is fresh, skipping refresh");
    }
  }

  async refreshAll(options: SyncOptions = {}): Promise<void> {
    const { force = false, silent = false, includeAlarms = true } = options;

    // Check cooldown for non-forced syncs
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.SYNC_COOLDOWN_MS) {
      logger.info("Sync cooldown active, skipping");
      return;
    }

    if (this.isSyncing) {
      logger.info("Sync already in progress, skipping");
      return;
    }

    const authStore = useAuthStore.getState();
    if (!authStore.isAuthenticated) {
      logger.info("User not authenticated, skipping sync");
      return;
    }

    this.isSyncing = true;
    this.lastSyncTime = now;

    try {
      logger.info("Starting full sync...", { force, silent });

      const taskStore = useTaskStore.getState();
      const goalStore = useGoalStore.getState();
      const alarmStore = useAlarmStore.getState();
      const subscriptionStore = useSubscriptionStore.getState();

      const promises = [
        taskStore.fetchTasks({ force, skipAlarmSync: !includeAlarms }),
        goalStore.fetchGoals(1, 100),
      ];

      if (includeAlarms) {
        promises.push(alarmStore.fetchAlarms(1, 500, true));
      }

      promises.push(subscriptionStore.fetchAIUsage().catch(() => {}));

      await Promise.all(promises);

      logger.info("Full sync completed successfully");
    } catch (error) {
      logger.error("Full sync failed:", error);
    } finally {
      this.isSyncing = false;
      this.lastSyncTime = Date.now();
    }
  }

  async refreshTasks(force: boolean = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.SYNC_COOLDOWN_MS) {
      logger.info("Sync cooldown active, skipping");
      return;
    }

    const taskStore = useTaskStore.getState();
    if (!force && taskStore.needsRefresh && !taskStore.needsRefresh()) {
      logger.info("Task cache is fresh, skipping");
      return;
    }
    await taskStore.fetchTasks({ force });
    this.lastSyncTime = Date.now();
  }

  async refreshGoals(force: boolean = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.SYNC_COOLDOWN_MS) {
      logger.info("Sync cooldown active, skipping");
      return;
    }

    const goalStore = useGoalStore.getState();
    if (!force && goalStore.needsRefresh && !goalStore.needsRefresh()) {
      logger.info("Goal cache is fresh, skipping");
      return;
    }
    await goalStore.fetchGoals(1, 100);
    this.lastSyncTime = Date.now();
  }

  async refreshAlarms(force: boolean = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < this.SYNC_COOLDOWN_MS) {
      logger.info("Sync cooldown active, skipping");
      return;
    }

    const alarmStore = useAlarmStore.getState();
    if (!force && alarmStore.needsRefresh && !alarmStore.needsRefresh()) {
      logger.info("Alarm cache is fresh, skipping");
      return;
    }
    await alarmStore.fetchAlarms(1, 500, true);
    this.lastSyncTime = Date.now();
  }

  markAllStale(): void {
    const taskStore = useTaskStore.getState();
    const goalStore = useGoalStore.getState();
    const alarmStore = useAlarmStore.getState();

    if (taskStore.markStale) taskStore.markStale();
    if (goalStore.markStale) goalStore.markStale();
    if (alarmStore.markStale) alarmStore.markStale();

    logger.info("All data marked as stale");
  }

  getSyncStatus(): { isSyncing: boolean; isInitialized: boolean } {
    return {
      isSyncing: this.isSyncing,
      isInitialized: this.isInitialized,
    };
  }

  // ✅ Reset cooldown (useful after user interaction)
  resetCooldown(): void {
    this.lastSyncTime = 0;
  }
}

export const appSync = new AppSyncService();

export async function syncAll(force: boolean = false): Promise<void> {
  return appSync.refreshAll({ force, silent: false });
}

export async function syncIfNeeded(): Promise<void> {
  return appSync.refreshIfNeeded();
}