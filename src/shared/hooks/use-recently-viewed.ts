import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'igrs-recent';
const MAX_ITEMS = 8;

/** Cached snapshot to maintain referential stability for useSyncExternalStore */
let cachedRaw: string | null | undefined = undefined; // undefined = never read / invalidated
let cachedSnapshot: number[] = [];

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => Number.isFinite(id)).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function getSnapshot(): number[] {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw && cachedRaw !== undefined) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = parseIds(raw);
  return cachedSnapshot;
}

function getServerSnapshot(): number[] {
  return [];
}

let listeners: Array<() => void> = [];

function emitChange(): void {
  // Invalidate cache by resetting to undefined, forcing re-read from sessionStorage
  cachedRaw = undefined;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

/**
 * Records a game ID as recently viewed.
 * Moves it to the front if already present, caps at MAX_ITEMS.
 */
export function recordRecentlyViewed(gameId: number): void {
  if (!Number.isFinite(gameId) || gameId <= 0) return;
  const current = parseIds(sessionStorage.getItem(STORAGE_KEY));
  const next = [gameId, ...current.filter(id => id !== gameId)].slice(0, MAX_ITEMS);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* storage full or unavailable */ }
  emitChange();
}

/**
 * Removes all entries from the recently viewed storage.
 * Usable in both product code (e.g., a "clear history" button) and tests.
 */
export function clearRecentlyViewed(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable */ }
  emitChange();
}

/**
 * React hook that returns the list of recently viewed game IDs (most recent first).
 */
export function useRecentlyViewed(): number[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns a stable callback to record a recently viewed game.
 */
export function useRecordRecentlyViewed(): (gameId: number) => void {
  return useCallback((gameId: number) => recordRecentlyViewed(gameId), []);
}
