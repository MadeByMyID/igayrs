import { useCallback, useSyncExternalStore } from 'react';

let _scrollVisible = false;
const _listeners = new Set<() => void>();

function _notify() {
  for (const listener of _listeners) listener();
}

function _handleScroll() {
  // Only notify subscribers when the boolean value actually changes
  const next = window.scrollY > 400;
  if (next !== _scrollVisible) {
    _scrollVisible = next;
    _notify();
  }
}

// Install a single passive scroll listener shared across all subscribers
let _installed = false;
function _ensureInstalled() {
  if (_installed) return;
  _installed = true;
  window.addEventListener('scroll', _handleScroll, { passive: true });
  _handleScroll();
}

function subscribe(callback: () => void): () => void {
  _ensureInstalled();
  _listeners.add(callback);
  return () => { _listeners.delete(callback); };
}

function getSnapshot(): boolean {
  return _scrollVisible;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useScrollTopVisibility(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Customizable threshold variant for cases where 400px default isn't desired.
 * Uses useSyncExternalStore with a stable subscribe function.
 */
export function useScrollTopVisibilityCustom(threshold: number): boolean {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('scroll', cb, { passive: true });
    return () => window.removeEventListener('scroll', cb);
  }, []);
  const getCustomSnapshot = useCallback(() => window.scrollY > threshold, [threshold]);
  return useSyncExternalStore(
    subscribe,
    getCustomSnapshot,
    () => false
  );
}
