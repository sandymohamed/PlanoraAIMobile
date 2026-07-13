export interface CacheMetadata {
  lastFetched: string | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface StoreWithCache<T> extends CacheMetadata {
  items: T[];
  fetch: (params?: any) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  needsRefresh: (maxAgeMinutes?: number) => boolean;
}

export const CACHE_CONFIG = {
  DEFAULT_MAX_AGE_MINUTES: 5,
  TASKS_MAX_AGE_MINUTES: 5,
  GOALS_MAX_AGE_MINUTES: 5,
  ALARMS_MAX_AGE_MINUTES: 5,
  ROUTINES_MAX_AGE_MINUTES: 10,
};