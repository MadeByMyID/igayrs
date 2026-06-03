import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadIgrsData } from '@/shared/api/data-service';
import { useLanguage } from '@/app/providers/language-provider';
import { createDataCache } from '@/shared/api/data-cache';
import type { IgrsData } from '@/shared/types';

interface DataContextValue {
  data: IgrsData | null;
  ensureData: () => Promise<IgrsData>;
  error: Error | null;
  loading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * Module-level cache keyed by unlocked state.
 * Persists across component unmounts within the same browser session.
 */
const cacheByUnlocked = {
  locked: createDataCache<IgrsData>(),
  unlocked: createDataCache<IgrsData>(),
};

function getCacheForState(unlocked: boolean) {
  return unlocked ? cacheByUnlocked.unlocked : cacheByUnlocked.locked;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { unlocked } = useLanguage();
  const [data, setData] = useState<IgrsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedUnlockedRef = useRef<boolean | null>(null);
  const pendingRef = useRef<{ promise: Promise<IgrsData>; unlocked: boolean } | null>(null);
  const dataRef = useRef<IgrsData | null>(null);
  const revalidatingRef = useRef(false);

  const ensureData = useCallback(async () => {
    const cache = getCacheForState(unlocked);
    const cached = cache.get();

    // If we have fresh cached data matching the current unlocked state, return immediately
    if (cached && cache.isFresh() && loadedUnlockedRef.current === unlocked) {
      return cached.data;
    }

    // If cache exists but is stale, serve cached data immediately and revalidate in background
    if (cached && cache.isStale() && loadedUnlockedRef.current === unlocked) {
      // Serve stale data immediately
      if (dataRef.current !== cached.data) {
        dataRef.current = cached.data;
        setData(cached.data);
      }

      // Revalidate in background (only if not already revalidating)
      if (!revalidatingRef.current) {
        revalidatingRef.current = true;
        loadIgrsData({ unlocked })
          .then(nextData => {
            cache.set(nextData);
            loadedUnlockedRef.current = unlocked;
            dataRef.current = nextData;
            setData(nextData);
          })
          .catch(() => {
            // On revalidation failure: retain cached data, no error surfaced
          })
          .finally(() => {
            revalidatingRef.current = false;
          });
      }

      return cached.data;
    }

    // Return cached data if it matches the current unlocked state (fresh, already loaded)
    if (dataRef.current && loadedUnlockedRef.current === unlocked) return dataRef.current;

    // Return in-flight request only if it matches the current unlocked state
    if (pendingRef.current && pendingRef.current.unlocked === unlocked) {
      return pendingRef.current.promise;
    }

    setLoading(true);
    setError(null);
    const request = loadIgrsData({ unlocked })
      .then(nextData => {
        // Store in module-level cache on successful fetch
        cache.set(nextData);
        loadedUnlockedRef.current = unlocked;
        dataRef.current = nextData;
        setData(nextData);
        return nextData;
      })
      .catch((nextError: unknown) => {
        const normalized = nextError instanceof Error ? nextError : new Error(String(nextError));
        setError(normalized);
        throw normalized;
      })
      .finally(() => {
        // Only clear pending if this is still the active request
        if (pendingRef.current?.promise === request) {
          pendingRef.current = null;
        }
        setLoading(false);
      });

    pendingRef.current = { promise: request, unlocked };
    return request;
  }, [unlocked]);

  // Re-fetch when unlocked state changes and we have stale data
  useEffect(() => {
    if (!dataRef.current || loadedUnlockedRef.current === unlocked) return;
    void ensureData().catch(() => undefined);
  }, [ensureData, unlocked]);

  const value = useMemo(() => ({ data, ensureData, error, loading }), [data, ensureData, error, loading]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useDataContext must be used within DataProvider');
  return context;
}

export function useRequiredIgrsData(): DataContextValue {
  const context = useDataContext();
  const { ensureData } = context;

  // Only depend on ensureData (stable ref via useCallback), not the full context object
  useEffect(() => {
    void ensureData().catch(() => undefined);
  }, [ensureData]);

  return context;
}
