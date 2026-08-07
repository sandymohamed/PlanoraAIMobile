//src/services/NativeAlarmBridge.ts
import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alarm } from "@/types/alarm";
import { logger } from "@/utils/logger";

const { AlarmModule } = NativeModules;

/**
 * Native Alarm Bridge
 *
 * This service bridges React Native code with the native Android AlarmModule.
 * All alarm scheduling/cancellation is handled by Android AlarmManager for reliability.
 */
class NativeAlarmBridge {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === "android" && AlarmModule) {
      // Use default emitter — events are sent via RCTDeviceEventEmitter from native code.
      this.eventEmitter = new NativeEventEmitter();
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners for native alarm events
   */
  private setupEventListeners(): void {
    if (!this.eventEmitter) return;

    // Notification "Snooze" button → reschedule same alarm (+5 min)
    this.eventEmitter.addListener(
      "AlarmSnooze",
      async (event: { alarmId: string; action: string }) => {
        const rawId = event?.alarmId;
        if (!rawId) return;
        const originalAlarmId = rawId
          .replace(/_snooze_\d+$/, "")
          .replace(/_snooze$/, "");
        logger.info("🔔 Native alarm snooze event:", {
          rawId,
          originalAlarmId,
        });
        try {
          const { useAlarmStore } = await import("@/store/alarmStore");
          await useAlarmStore.getState().snoozeAlarm(originalAlarmId, 5);
          await AsyncStorage.removeItem("pending_snooze_alarm_id").catch(
            () => {},
          );
          logger.info("✅ Alarm snoozed from notification");
        } catch (error) {
          logger.error("❌ Snooze from notification failed:", error);
          await AsyncStorage.setItem(
            "pending_snooze_alarm_id",
            originalAlarmId,
          ).catch(() => {});
        }
      },
    );

    // Listen for stop events
    // Note: The alarm sound/vibration is already stopped by AlarmActionReceiver
    // This event just notifies JS to clean up UI state
    this.eventEmitter.addListener(
      "AlarmStop",
      async (event: { alarmId: string; action: string }) => {
        logger.info("🔔 Native alarm stop event received:", event.alarmId);
        try {
          const { track, AnalyticsEvents } =
            await import("@/analytics/posthog");
          track(AnalyticsEvents.ALARM_DISMISSED);
          // Clear any pending alarm state
          await AsyncStorage.removeItem("pending_alarm_id").catch(() => {});
          await AsyncStorage.removeItem("active_alarm").catch(() => {});
          logger.info("✅ Alarm stopped - state cleared");
        } catch (error) {
          logger.error("❌ Failed to clear alarm state:", error);
        }
      },
    );

    // Listen for alarm fired events (for UI updates)
    this.eventEmitter.addListener(
      "AlarmFired",
      (event: { alarmId: string; title: string; action: string }) => {
        logger.info("🔔 Native alarm fired event:", event.alarmId);
        import("@/analytics/posthog")
          .then(({ track, AnalyticsEvents }) => {
            track(AnalyticsEvents.ALARM_TRIGGERED);
          })
          .catch(() => {});
        // Store pending alarm for UI
        AsyncStorage.setItem("pending_alarm_id", event.alarmId).catch((err) => {
          logger.error("Failed to store pending alarm ID:", err);
        });
      },
    );
  }

  /**
   * Schedule an alarm using native Android AlarmManager
   */
  async scheduleAlarm(alarm: Alarm): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return;
    }

    try {
logger.info(`** alarm.time: ${alarm.time}`)
      const alarmTime = new Date(alarm.time);
      const timestamp = alarmTime.getTime();
      logger.info(
        `*** 📅 Scheduling native alarm: ${alarm.id} at ${alarmTime.toISOString()} (timestamp: ${timestamp})`,
      );
      // Ensure alarm time is in the future
      const now = Date.now();
      if (timestamp <= now) {
        logger.warn(
          `⚠️ Alarm time is in the past: ${alarmTime.toISOString()}, now: ${new Date(now).toISOString()}, diff: ${(now - timestamp) / 1000}s`,
        );

        // For recurring alarms, calculate next occurrence
        if (
          alarm.recurrenceRule &&
          alarm.recurrenceRule !== "none" &&
          alarm.recurrenceRule !== null
        ) {
          const nextTime = this.calculateNextOccurrence(
            alarmTime,
            alarm.recurrenceRule,
          );
          logger.info(
            `📅 Recalculating recurring alarm to next occurrence: ${nextTime.toISOString()}`,
          );
          return this.scheduleAlarm({ ...alarm, time: nextTime.toISOString() });
        } else {
          // For one-time alarms (snooze alarms), ensure they're at least 10 seconds in the future
          // Sometimes there's a small timing issue
          const minFutureTime = now + 10000; // 10 seconds minimum
          if (timestamp < minFutureTime) {
            logger.warn(
              `⚠️ One-time alarm too close to now or in past, adjusting to ${new Date(minFutureTime).toISOString()}`,
            );
            return this.scheduleAlarm({
              ...alarm,
              time: new Date(minFutureTime).toISOString(),
            });
          }
          // If it's very close but still valid, allow it
          logger.info(`✅ Alarm time is very close to now but still valid`);
        }
      }

      logger.info(`📅 Calling native AlarmModule.scheduleAlarm`, {
        alarmId: alarm.id,
        timestamp,
        title: alarm.title,
        recurrenceRule: alarm.recurrenceRule || "none",
        timeUntilAlarm:
          Math.floor((timestamp - Date.now()) / 1000) + " seconds",
      });

      await AlarmModule.scheduleAlarm(
        alarm.id,
        timestamp,
        alarm.title,
        alarm.toneUrl || null,
        alarm.recurrenceRule || null,
      );

      logger.info(`✅ Native alarm scheduled successfully`, {
        alarmId: alarm.id,
        title: alarm.title,
        time: alarmTime.toISOString(),
        timestamp,
        recurrenceRule: alarm.recurrenceRule || "none",
        timeUntilAlarm:
          Math.floor((timestamp - Date.now()) / 1000) + " seconds",
      });
    } catch (error) {
      logger.error("❌ Failed to schedule native alarm:", error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled alarm
   */
  async cancelAlarm(alarmId: string): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return;
    }

    try {
      await AlarmModule.cancelAlarm(alarmId);
      logger.info(`✅ Native alarm canceled: ${alarmId}`);
    } catch (error) {
      logger.error("❌ Failed to cancel native alarm:", error);
      throw error;
    }
  }

  /**
   * Cancel all alarms matching a pattern (for canceling snooze alarms)
   * This is a helper method to cancel multiple alarms with similar IDs
   */
  async cancelAlarmPattern(pattern: string): Promise<void> {
    // This method might not be available in the native module
    // If not, individual cancel calls should be made instead
    // For now, we'll just log - the caller should handle individual cancellations
    logger.info(
      `⚠️ Pattern cancellation requested for: ${pattern} (not implemented, using individual cancels)`,
    );
  }

  /**
   * Open system ringtone picker
   */
  async pickRingtone(): Promise<string | null> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return null;
    }

    try {
      const uri = await AlarmModule.pickRingtone();
      return uri;
    } catch (error) {
      logger.error("❌ Failed to pick ringtone:", error);
      return null;
    }
  }

  /**
   * Get default alarm ringtone URI
   */
  async getDefaultRingtoneUri(): Promise<string | null> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return null;
    }

    try {
      const uri = await AlarmModule.getDefaultRingtoneUri();
      return uri;
    } catch (error) {
      logger.error("❌ Failed to get default ringtone:", error);
      return null;
    }
  }

  /**
   * Get ringtone title/name from URI
   */
  async getRingtoneTitle(uri: string): Promise<string | null> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return null;
    }

    try {
      const title = await AlarmModule.getRingtoneTitle(uri);
      return title;
    } catch (error) {
      logger.error("❌ Failed to get ringtone title:", error);
      return null;
    }
  }

  /**
   * Stop currently playing alarm
   */
  async stopPlayingAlarm(): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return;
    }

    try {
      await AlarmModule.stopPlayingAlarm();
      logger.info("✅ Alarm stopped successfully");
    } catch (error) {
      logger.error("❌ Failed to stop playing alarm:", error);
      throw error;
    }
  }

  /**
   * Snooze an alarm by rescheduling it for a later time
   * CRITICAL: This reschedules the SAME alarm ID, not creating a new alarm
   * This prevents sound channel conflicts and ID duplication issues
   *
   * @param alarmId - The alarm ID to snooze (same ID is reused)
   * @param snoozeMinutes - Number of minutes to snooze (default: 5)
   * @param alarmTitle - Alarm title (for rescheduling)
   * @param toneUrl - Alarm ringtone URI (for rescheduling)
   * @param recurrenceRule - Alarm recurrence rule (for rescheduling, typically null for snooze)
   */
  async snoozeAlarm(
    alarmId: string,
    snoozeMinutes: number = 5,
    alarmTitle: string,
    toneUrl: string | null = null,
    recurrenceRule: string | null = null,
  ): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return;
    }

    try {
      const now = Date.now();
      const snoozeTime = now + snoozeMinutes * 60 * 1000;

      // Check if native module has snooze method (preferred)
      if (AlarmModule.snooze && typeof AlarmModule.snooze === "function") {
        logger.info(
          `🔔 Snoozing alarm ${alarmId} for ${snoozeMinutes} minutes using native snooze method`,
        );
        await AlarmModule.snooze(alarmId, snoozeTime, snoozeMinutes);
        logger.info(
          `✅ Alarm ${alarmId} snoozed successfully until ${new Date(snoozeTime).toISOString()}`,
        );
      } else {
        // Fallback: Cancel and reschedule (less ideal but works)
        logger.info(
          `🔔 Snoozing alarm ${alarmId} for ${snoozeMinutes} minutes (fallback: cancel + reschedule)`,
        );

        // Cancel the current alarm
        await this.cancelAlarm(alarmId);

        // Reschedule the same alarm ID with new time
        await AlarmModule.scheduleAlarm(
          alarmId, // SAME alarm ID (critical for stable PendingIntent)
          snoozeTime,
          alarmTitle,
          toneUrl,
          recurrenceRule,
        );

        logger.info(
          `✅ Alarm ${alarmId} rescheduled (snoozed) until ${new Date(snoozeTime).toISOString()}`,
        );
      }
    } catch (error) {
      logger.error(`❌ Failed to snooze alarm ${alarmId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel ALL alarms (first-launch cleanup)
   * This removes any legacy alarms from previous installations
   */
  async cancelAllAlarms(): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) {
      logger.warn("⚠️ Native AlarmModule not available");
      return;
    }

    try {
      if (
        AlarmModule.cancelAllAlarms &&
        typeof AlarmModule.cancelAllAlarms === "function"
      ) {
        await AlarmModule.cancelAllAlarms();
        logger.info("✅ All native alarms cancelled (cleanup)");
      } else {
        logger.warn("⚠️ cancelAllAlarms method not available in native module");
        // Note: Individual cancellation will happen during fetchAlarms
      }
    } catch (error) {
      logger.error("❌ Failed to cancel all alarms:", error);
      // Don't throw - this is cleanup, not critical
    }
  }

  /** Read native boot/update flag set by BootReceiver. */
  async getAndClearNeedsReschedule(): Promise<boolean> {
    if (Platform.OS !== "android" || !AlarmModule) return false;
    try {
      if (
        AlarmModule.getAndClearNeedsReschedule &&
        typeof AlarmModule.getAndClearNeedsReschedule === "function"
      ) {
        return Boolean(await AlarmModule.getAndClearNeedsReschedule());
      }
    } catch (error) {
      logger.warn("getAndClearNeedsReschedule failed:", error);
    }
    return false;
  }

  /**
   * Check if exact alarm permission is granted (Android 12+)
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (Platform.OS !== "android" || !AlarmModule) return true;
    if (Platform.Version < 31) return true; // Android 11 and below

    try {
      if (
        AlarmModule.canScheduleExactAlarms &&
        typeof AlarmModule.canScheduleExactAlarms === "function"
      ) {
        return await AlarmModule.canScheduleExactAlarms();
      }
      return true; // Assume granted if method doesn't exist
    } catch (error) {
      logger.error("❌ Error checking exact alarm permission:", error);
      return false;
    }
  }

  /**
   * Open exact alarm permission settings (Android 12+)
   */
  async openExactAlarmSettings(): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) return;
    if (Platform.Version < 31) return;

    try {
      if (
        AlarmModule.openExactAlarmSettings &&
        typeof AlarmModule.openExactAlarmSettings === "function"
      ) {
        await AlarmModule.openExactAlarmSettings();
      } else {
        logger.warn("⚠️ openExactAlarmSettings method not available");
      }
    } catch (error) {
      logger.error("❌ Error opening exact alarm settings:", error);
    }
  }

  /**
   * Check if battery optimization is disabled for this app
   */
  async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (Platform.OS !== "android" || !AlarmModule) return true;

    try {
      if (
        AlarmModule.isIgnoringBatteryOptimizations &&
        typeof AlarmModule.isIgnoringBatteryOptimizations === "function"
      ) {
        return await AlarmModule.isIgnoringBatteryOptimizations();
      }
      return true; // Assume optimized if method doesn't exist
    } catch (error) {
      logger.error("❌ Error checking battery optimization:", error);
      return false;
    }
  }

  /**
   * Request battery optimization exemption
   */
  async requestIgnoreBatteryOptimizations(): Promise<void> {
    if (Platform.OS !== "android" || !AlarmModule) return;

    try {
      if (
        AlarmModule.requestIgnoreBatteryOptimizations &&
        typeof AlarmModule.requestIgnoreBatteryOptimizations === "function"
      ) {
        await AlarmModule.requestIgnoreBatteryOptimizations();
      } else {
        logger.warn(
          "⚠️ requestIgnoreBatteryOptimizations method not available",
        );
      }
    } catch (error) {
      logger.error(
        "❌ Error requesting battery optimization exemption:",
        error,
      );
    }
  }

  /**
   * Calculate next occurrence for recurring alarms
   */
  private calculateNextOccurrence(
    alarmTime: Date,
    recurrenceRule: string,
  ): Date {
    const now = new Date();
    const next = new Date(alarmTime);

    const isWeekday = (d: Date) => {
      const day = d.getDay();
      return day >= 1 && day <= 5;
    };
    const isWeekend = (d: Date) => {
      const day = d.getDay();
      return day === 0 || day === 6;
    };

    if (recurrenceRule.includes("FREQ=DAILY") || recurrenceRule === "daily") {
      while (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
    } else if (recurrenceRule === "weekdays") {
      do {
        next.setDate(next.getDate() + 1);
      } while (!isWeekday(next) || next.getTime() <= now.getTime());
    } else if (recurrenceRule === "weekends") {
      do {
        next.setDate(next.getDate() + 1);
      } while (!isWeekend(next) || next.getTime() <= now.getTime());
    } else if (
      recurrenceRule.includes("FREQ=WEEKLY") ||
      recurrenceRule === "weekly"
    ) {
      while (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 7);
      }
    } else if (
      recurrenceRule.includes("FREQ=MONTHLY") ||
      recurrenceRule === "monthly"
    ) {
      while (next.getTime() <= now.getTime()) {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next;
  }

  /**
   * Remove event listeners
   */
  removeListeners(): void {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners("AlarmSnooze");
      this.eventEmitter.removeAllListeners("AlarmStop");
    }
  }
}

export const nativeAlarmBridge = new NativeAlarmBridge();
