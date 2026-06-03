import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of the provided value.
 * The returned value only updates after `delayMs` milliseconds
 * of inactivity (no new value changes).
 *
 * - Cancels pending timer on new value
 * - Restarts timer on each change
 * - Executes exactly once per pause with the final value
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
