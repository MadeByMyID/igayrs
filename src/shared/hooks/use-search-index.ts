/**
 * Hook that offloads search index creation to a Web Worker.
 *
 * Falls back to main-thread index creation when the Worker API is unavailable
 * or fails to load.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createGameSearchIndex } from '@/core/search-index';
import { descriptorIdsFromGame, ratingIdsFromGame } from '@/shared/lib/ratings';
import { platformIdsFromGame } from '@/shared/lib/platforms';
import type { IgrsGame, IgrsMeta, SearchIndex, SearchIndexItem } from '@/shared/types';
import type { SerializedSearchIndexItem, WorkerError, WorkerMessage, WorkerResponse } from '@/core/search-index.worker';

const WORKER_TIMEOUT_MS = 30_000;

interface UseSearchIndexResult {
  index: SearchIndex | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

function reconstructIndex(items: SerializedSearchIndexItem[]): SearchIndexItem[] {
  return items.map(item => ({
    game: item.game,
    nameNorm: item.nameNorm,
    publisherNorm: item.publisherNorm,
    ratingIds: item.ratingIds,
    descriptorIds: item.descriptorIds,
    platformIds: item.platformIds,
    ratingIdSet: new Set(item.ratingIdArr),
    descriptorIdSet: new Set(item.descriptorIdArr),
    platformIdSet: new Set(item.platformIdArr),
    year: item.year,
  }));
}

function buildIndexSync(games: IgrsGame[], meta: IgrsMeta): SearchIndex {
  return createGameSearchIndex(games, {
    getDescriptorIds: descriptorIdsFromGame,
    getPlatformIds: (game: IgrsGame) => platformIdsFromGame(meta, game),
    getRatingIds: ratingIdsFromGame,
  });
}

function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined';
}

export function useSearchIndex(games: IgrsGame[] | null, meta: IgrsMeta | null): UseSearchIndexResult {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const buildIndexWithWorker = useCallback((gameList: IgrsGame[], metaData: IgrsMeta) => {
    cleanup();
    setLoading(true);
    setError(null);

    if (!isWorkerAvailable()) {
      console.warn('[useSearchIndex] Worker API unavailable, falling back to main thread');
      try {
        const result = buildIndexSync(gameList, metaData);
        setIndex(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to build search index'));
      }
      setLoading(false);
      return;
    }

    try {
      const worker = new Worker(
        new URL('../../core/search-index.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      timeoutRef.current = setTimeout(() => {
        console.error('[useSearchIndex] Worker timed out after 30 seconds');
        cleanup();
        setLoading(false);
        setError(new Error('Search index creation timed out after 30 seconds'));
      }, WORKER_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<WorkerResponse | WorkerError>) => {
        const data = event.data;

        if (data.type === 'index-ready') {
          if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          const reconstructedItems = reconstructIndex(data.items);
          setIndex({ items: reconstructedItems, facets: data.facets });
          setLoading(false);
          setError(null);
        } else if (data.type === 'error') {
          console.error('[useSearchIndex] Worker error:', data.message);
          cleanup();
          setLoading(false);
          setError(new Error(data.message));
        }
      };

      worker.onerror = event => {
        console.error('[useSearchIndex] Worker failed to load:', event.message);
        cleanup();
        try {
          const result = buildIndexSync(gameList, metaData);
          setIndex(result);
          setLoading(false);
          setError(null);
        } catch (err) {
          setLoading(false);
          setError(err instanceof Error ? err : new Error(event.message || 'Worker failed to load'));
        }
      };

      const message: WorkerMessage = { type: 'build-index', games: gameList, meta: metaData };
      worker.postMessage(message);
    } catch (err) {
      console.warn('[useSearchIndex] Failed to create worker, falling back to main thread:', err);
      try {
        const result = buildIndexSync(gameList, metaData);
        setIndex(result);
        setLoading(false);
        setError(null);
      } catch (fallbackErr) {
        setLoading(false);
        setError(fallbackErr instanceof Error ? fallbackErr : new Error('Failed to create Web Worker'));
      }
    }
  }, [cleanup]);

  useEffect(() => {
    if (!games || !meta) {
      setIndex(null);
      setLoading(false);
      setError(null);
      return;
    }

    buildIndexWithWorker(games, meta);

    return cleanup;
  }, [games, meta, retryCount, buildIndexWithWorker, cleanup]);

  const retry = useCallback(() => {
    setRetryCount(count => count + 1);
  }, []);

  return { index, loading, error, retry };
}
