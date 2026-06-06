import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createIgrsDataClient } from '@/shared/api/igrs-data-client';
import { useLanguage } from '@/app/providers/language-provider';
import type { IgrsData } from '@/shared/types';

interface DataContextValue {
  data: IgrsData | null;
  ensureData: () => Promise<IgrsData>;
  error: Error | null;
  loading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

/** Module-level singleton — persists across component unmounts within the same browser session. */
const client = createIgrsDataClient();

export function DataProvider({ children }: { children: ReactNode }) {
  const { unlocked } = useLanguage();
  const [data, setData] = useState<IgrsData | null>(() => client.getCached({ unlocked }));
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedUnlockedRef = useRef<boolean | null>(null);

  // Sync React state when the client emits new data
  useEffect(() => {
    const unsubscribe = client.subscribe(nextData => {
      setData(nextData);
    });
    return unsubscribe;
  }, []);

  const ensureData = useCallback(async () => {
    const cached = client.getCached({ unlocked });

    // Fresh or stale cache for current unlocked state → delegate to client (no loading state)
    if (cached && loadedUnlockedRef.current === unlocked) {
      return client.getData({ unlocked });
    }

    // No cache for current state → show loading indicator
    setLoading(true);
    setError(null);
    try {
      const nextData = await client.getData({ unlocked });
      loadedUnlockedRef.current = unlocked;
      setData(nextData);
      return nextData;
    } catch (nextError: unknown) {
      const normalized = nextError instanceof Error ? nextError : new Error(String(nextError));
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, [unlocked]);

  // Re-fetch when unlocked state changes and data was loaded for a different state
  useEffect(() => {
    if (loadedUnlockedRef.current === null || loadedUnlockedRef.current === unlocked) return;
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
