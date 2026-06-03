/**
 * Shared collection utilities used across search and filter components.
 */

/**
 * Returns a new Set with the given value toggled (added if absent, removed if present).
 */
export function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Returns sorted numeric values from an iterable.
 */
export function sortedNumbers(values: Iterable<number>): number[] {
  return [...values].sort((a, b) => a - b);
}

/**
 * Returns sorted year strings (descending by numeric value).
 */
export function sortedYears(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => Number(b) - Number(a));
}
