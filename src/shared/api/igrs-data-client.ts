/**
 * Framework-agnostic data client with stale-while-revalidate caching.
 *
 * Encapsulates all data fetching and caching logic so UI layers (React, etc.)
 * remain thin wrappers that subscribe to state changes.
 */

import { createDataCache, type DataCache } from '@/shared/api/data-cache';
import { loadIgrsData } from '@/shared/api/data-service';
import type { IgrsData } from '@/shared/types';

type Listener = (data: IgrsData) => void;

export interface IgrsDataClient {
  /** Returns cached if fresh, serves stale while revalidating in background, fetches fresh if empty. */
  getData(options: { unlocked: boolean }): Promise<IgrsData>;
  /** Synchronous access to the current cache. Returns null if nothing is cached. */
  getCached(options: { unlocked: boolean }): IgrsData | null;
  /** Subscribe to data changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void;
}

/**
 * Creates a framework-agnostic IGRS data client with stale-while-revalidate caching.
 *
 * Maintains module-level caches keyed by unlocked state. Background revalidation
 * failures are silently swallowed — cached data is retained.
 */
export function createIgrsDataClient(): IgrsDataClient {
  const cacheByUnlocked: Record<'locked' | 'unlocked', DataCache<IgrsData>> = {
    locked: createDataCache<IgrsData>(),
    unlocked: createDataCache<IgrsData>(),
  };

  let revalidating = false;
  let pendingRequest: { promise: Promise<IgrsData>; unlocked: boolean } | null = null;
  const listeners = new Set<Listener>();

  function getCacheForState(unlocked: boolean): DataCache<IgrsData> {
    return unlocked ? cacheByUnlocked.unlocked : cacheByUnlocked.locked;
  }

  function notify(data: IgrsData): void {
    for (const listener of listeners) {
      listener(data);
    }
  }

  function getCached(options: { unlocked: boolean }): IgrsData | null {
    const cache = getCacheForState(options.unlocked);
    const entry = cache.get();
    return entry ? entry.data : null;
  }

  async function getData(options: { unlocked: boolean }): Promise<IgrsData> {
    const { unlocked } = options;
    const cache = getCacheForState(unlocked);
    const cached = cache.get();

    // Fresh cache → return immediately
    if (cached && cache.isFresh()) {
      return cached.data;
    }

    // Stale cache → serve stale immediately, revalidate in background
    if (cached && cache.isStale()) {
      if (!revalidating) {
        revalidating = true;
        loadIgrsData({ unlocked })
          .then(nextData => {
            cache.set(nextData);
            notify(nextData);
          })
          .catch(() => {
            // Background revalidation failure: silently retain cached data
          })
          .finally(() => {
            revalidating = false;
          });
      }
      return cached.data;
    }

    // No cache → fetch fresh. Deduplicate in-flight requests for same unlocked state.
    if (pendingRequest && pendingRequest.unlocked === unlocked) {
      return pendingRequest.promise;
    }

    const request = loadIgrsData({ unlocked })
      .then(nextData => {
        cache.set(nextData);
        notify(nextData);
        return nextData;
      })
      .finally(() => {
        if (pendingRequest?.promise === request) {
          pendingRequest = null;
        }
      });

    pendingRequest = { promise: request, unlocked };
    return request;
  }

  function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  return { getData, getCached, subscribe };
}
