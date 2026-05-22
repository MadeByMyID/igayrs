import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadIgrsData } from '@/shared/api/data-service';
import { useLanguage } from '@/app/providers/language-provider';
import type { IgrsData } from '@/shared/types';

interface DataContextValue {
  data: IgrsData | null;
  ensureData: () => Promise<IgrsData>;
  error: Error | null;
  loading: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { unlocked } = useLanguage();
  const [data, setData] = useState<IgrsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const loadedUnlockedRef = useRef<boolean | null>(null);
  const pendingRef = useRef<Promise<IgrsData> | null>(null);

  const ensureData = useCallback(async () => {
    if (data && loadedUnlockedRef.current === unlocked) return data;
    if (pendingRef.current) return pendingRef.current;

    setLoading(true);
    setError(null);
    const request = loadIgrsData({ unlocked })
      .then(nextData => {
        loadedUnlockedRef.current = unlocked;
        setData(nextData);
        return nextData;
      })
      .catch((nextError: unknown) => {
        const normalized = nextError instanceof Error ? nextError : new Error(String(nextError));
        setError(normalized);
        throw normalized;
      })
      .finally(() => {
        pendingRef.current = null;
        setLoading(false);
      });

    pendingRef.current = request;
    return request;
  }, [data, unlocked]);

  useEffect(() => {
    if (!data || loadedUnlockedRef.current === unlocked) return;
    void ensureData().catch(() => undefined);
  }, [data, ensureData, unlocked]);

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

  useEffect(() => {
    void context.ensureData().catch(() => undefined);
  }, [context]);

  return context;
}
