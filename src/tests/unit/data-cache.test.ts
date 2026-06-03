import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { createDataCache } from '../../shared/api/data-cache';

describe('data-cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when cache is empty', () => {
    const cache = createDataCache<string>();
    expect(cache.get()).toBeNull();
  });

  it('stores and retrieves data', () => {
    const cache = createDataCache<{ name: string }>();
    const testData = { name: 'test' };
    cache.set(testData);

    const entry = cache.get();
    expect(entry).not.toBeNull();
    expect(entry!.data).toBe(testData);
    expect(entry!.timestamp).toBeTypeOf('number');
  });

  it('reports fresh when within staleness threshold', () => {
    const cache = createDataCache<string>();
    cache.set('hello');

    expect(cache.isFresh()).toBe(true);
    expect(cache.isStale()).toBe(false);
  });

  it('reports stale after 5 minutes', () => {
    const cache = createDataCache<string>();
    cache.set('hello');

    // Advance time by 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(cache.isFresh()).toBe(false);
    expect(cache.isStale()).toBe(true);
  });

  it('reports fresh just before 5 minutes', () => {
    const cache = createDataCache<string>();
    cache.set('hello');

    // Advance time by 4 minutes 59 seconds
    vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);

    expect(cache.isFresh()).toBe(true);
    expect(cache.isStale()).toBe(false);
  });

  it('isStale returns false when cache is empty', () => {
    const cache = createDataCache<string>();
    expect(cache.isStale()).toBe(false);
  });

  it('isFresh returns false when cache is empty', () => {
    const cache = createDataCache<string>();
    expect(cache.isFresh()).toBe(false);
  });

  it('clears the cache', () => {
    const cache = createDataCache<string>();
    cache.set('hello');
    expect(cache.get()).not.toBeNull();

    cache.clear();
    expect(cache.get()).toBeNull();
    expect(cache.isFresh()).toBe(false);
    expect(cache.isStale()).toBe(false);
  });

  it('updates timestamp on subsequent set calls', () => {
    const cache = createDataCache<string>();
    cache.set('first');
    const firstTimestamp = cache.get()!.timestamp;

    vi.advanceTimersByTime(1000);
    cache.set('second');
    const secondTimestamp = cache.get()!.timestamp;

    expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    expect(cache.get()!.data).toBe('second');
  });
});
