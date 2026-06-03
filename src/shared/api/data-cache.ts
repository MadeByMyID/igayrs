/**
 * Stale-while-revalidate data cache.
 *
 * Provides a module-level cache with a configurable staleness threshold.
 * Cached data persists across component unmounts within the same browser session.
 * After the staleness threshold, cached data is still served immediately while
 * a background revalidation fetch occurs.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const STALENESS_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface DataCache<T> {
  /** Returns the cached entry, or null if nothing is cached. */
  get(): CacheEntry<T> | null;
  /** Stores data with the current timestamp. */
  set(data: T): void;
  /** Returns true if the cache exists but is older than the staleness threshold. */
  isStale(): boolean;
  /** Returns true if the cache exists and is within the staleness threshold. */
  isFresh(): boolean;
  /** Removes the cached entry. */
  clear(): void;
}

/**
 * Creates a typed data cache instance with a 5-minute staleness threshold.
 *
 * Usage:
 * ```ts
 * const cache = createDataCache<IgrsData>();
 * cache.set(data);
 * if (cache.isFresh()) return cache.get()!.data;
 * ```
 */
export function createDataCache<T>(): DataCache<T> {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): CacheEntry<T> | null {
      return entry;
    },

    set(data: T): void {
      entry = { data, timestamp: Date.now() };
    },

    isStale(): boolean {
      if (!entry) return false;
      return Date.now() - entry.timestamp >= STALENESS_THRESHOLD_MS;
    },

    isFresh(): boolean {
      if (!entry) return false;
      return Date.now() - entry.timestamp < STALENESS_THRESHOLD_MS;
    },

    clear(): void {
      entry = null;
    },
  };
}
