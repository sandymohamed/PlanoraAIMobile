/**
 * Ephemeral analytics context set by screens immediately before store calls.
 * Avoids changing public store/service API signatures.
 */
export type PendingAnalyticsContext = {
  taskCreateSource?: string;
  taskCompleteSource?: string;
  goalCreateSource?: string;
  habitCreateSource?: string;
  alarmCreateSource?: string;
  calendarEventAction?: 'created' | 'updated' | 'deleted';
};

const pending: PendingAnalyticsContext = {};

export function setPendingAnalyticsContext(patch: PendingAnalyticsContext): void {
  Object.assign(pending, patch);
}

export function consumePendingAnalytics<K extends keyof PendingAnalyticsContext>(
  key: K
): PendingAnalyticsContext[K] {
  const value = pending[key];
  delete pending[key];
  return value;
}

export function clearPendingAnalytics(): void {
  for (const key of Object.keys(pending) as (keyof PendingAnalyticsContext)[]) {
    delete pending[key];
  }
}
