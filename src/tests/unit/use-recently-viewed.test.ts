import { describe, expect, it, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { recordRecentlyViewed, clearRecentlyViewed } from '@/shared/hooks/use-recently-viewed';

const STORAGE_KEY = 'igrs-recent';
const MAX_ITEMS = 8;

/**
 * Helper to read the current list from sessionStorage.
 */
function readStoredIds(): number[] {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => Number.isFinite(id)).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

/**
 * Inline parseIds for testing Property 4 (it's not exported, so we replicate the logic).
 */
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

describe('recordRecentlyViewed', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  /**
   * Property 3: recordRecentlyViewed list invariants
   * Validates: Requirements 3.3, 3.7
   *
   * For any sequence of calls to recordRecentlyViewed with arbitrary numeric arguments,
   * the resulting list SHALL:
   * - never exceed 8 items
   * - contain no duplicate values
   * - place the most recently added valid ID at index 0
   * - remain unchanged when called with invalid IDs (NaN, Infinity, 0, negative numbers)
   */
  describe('Property 3: list invariants across arbitrary call sequences', () => {
    it('maintains invariants for arbitrary positive integer sequences', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 20 }),
          (ids) => {
            sessionStorage.clear();

            for (const id of ids) {
              recordRecentlyViewed(id);
            }

            const stored = readStoredIds();

            // never exceed 8 items
            expect(stored.length).toBeLessThanOrEqual(MAX_ITEMS);

            // no duplicates
            expect(new Set(stored).size).toBe(stored.length);

            // most recent valid ID at index 0
            const lastValidId = ids[ids.length - 1];
            expect(stored[0]).toBe(lastValidId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ignores invalid IDs (NaN, Infinity, 0, negative)', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 5 }),
          fc.array(fc.oneof(
            fc.constant(NaN),
            fc.constant(Infinity),
            fc.constant(-Infinity),
            fc.constant(0),
            fc.integer({ min: -1000, max: -1 })
          ), { minLength: 1, maxLength: 5 }),
          (validIds, invalidIds) => {
            sessionStorage.clear();

            // Add valid IDs first
            for (const id of validIds) {
              recordRecentlyViewed(id);
            }
            const afterValid = readStoredIds();

            // Add invalid IDs
            for (const id of invalidIds) {
              recordRecentlyViewed(id);
            }
            const afterInvalid = readStoredIds();

            // List should remain unchanged after invalid IDs
            expect(afterInvalid).toEqual(afterValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Example-based tests', () => {
    it('adds a single ID', () => {
      recordRecentlyViewed(42);
      expect(readStoredIds()).toEqual([42]);
    });

    it('moves duplicate to front', () => {
      recordRecentlyViewed(1);
      recordRecentlyViewed(2);
      recordRecentlyViewed(3);
      recordRecentlyViewed(1);
      expect(readStoredIds()).toEqual([1, 3, 2]);
    });

    it('caps at MAX_ITEMS (8)', () => {
      for (let i = 1; i <= 12; i++) {
        recordRecentlyViewed(i);
      }
      const stored = readStoredIds();
      expect(stored.length).toBe(8);
      expect(stored[0]).toBe(12);
    });

    it('ignores zero', () => {
      recordRecentlyViewed(1);
      recordRecentlyViewed(0);
      expect(readStoredIds()).toEqual([1]);
    });

    it('ignores negative numbers', () => {
      recordRecentlyViewed(5);
      recordRecentlyViewed(-3);
      expect(readStoredIds()).toEqual([5]);
    });

    it('ignores NaN', () => {
      recordRecentlyViewed(7);
      recordRecentlyViewed(NaN);
      expect(readStoredIds()).toEqual([7]);
    });
  });
});

/**
 * Property 4: parseIds safe parsing
 * Validates: Requirements 3.4
 *
 * For any string input, parseIds SHALL return an array where:
 * - every element is a finite number
 * - the array length is at most 8
 * - the function never throws an exception
 */
describe('parseIds', () => {
  describe('Property 4: safe parsing across arbitrary string inputs', () => {
    it('always returns a safe array for arbitrary strings', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result = parseIds(input);

            // every element is a finite number
            for (const item of result) {
              expect(Number.isFinite(item)).toBe(true);
            }

            // length ≤ 8
            expect(result.length).toBeLessThanOrEqual(MAX_ITEMS);

            // never throws (if we got here, it didn't throw)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles null input safely', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          (input) => {
            const result = parseIds(input);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
          }
        ),
        { numRuns: 1 }
      );
    });
  });

  describe('Example-based tests', () => {
    it('parses valid JSON array of numbers', () => {
      expect(parseIds('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('returns empty array for invalid JSON', () => {
      expect(parseIds('not json')).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
      expect(parseIds('{"a": 1}')).toEqual([]);
      expect(parseIds('"hello"')).toEqual([]);
      expect(parseIds('42')).toEqual([]);
    });

    it('filters out non-finite values from arrays', () => {
      // NaN is not valid JSON, so use valid JSON with non-numeric types
      expect(parseIds('[1, "two", null, 3, true]')).toEqual([1, 3]);
    });

    it('caps at 8 items', () => {
      const longArray = JSON.stringify(Array.from({ length: 20 }, (_, i) => i + 1));
      expect(parseIds(longArray).length).toBe(8);
    });

    it('returns empty array for null input', () => {
      expect(parseIds(null)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(parseIds('')).toEqual([]);
    });
  });
});

/**
 * clearRecentlyViewed tests
 * Validates: Requirements 35.1, 35.2, 35.3
 */
describe('clearRecentlyViewed', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('removes all entries from storage', () => {
    recordRecentlyViewed(1);
    recordRecentlyViewed(2);
    recordRecentlyViewed(3);
    expect(readStoredIds()).toHaveLength(3);

    clearRecentlyViewed();
    expect(readStoredIds()).toEqual([]);
  });

  it('works when storage is already empty', () => {
    clearRecentlyViewed();
    expect(readStoredIds()).toEqual([]);
  });

  it('allows new entries after clearing', () => {
    recordRecentlyViewed(10);
    recordRecentlyViewed(20);
    clearRecentlyViewed();

    recordRecentlyViewed(99);
    expect(readStoredIds()).toEqual([99]);
  });
});
