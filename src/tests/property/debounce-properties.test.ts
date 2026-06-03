// Feature: igrs-codebase-improvements, Property 9: Debounce Executes Exactly Once Per Pause
// **Validates: Requirements 10.1, 10.2, 10.3, 10.5**

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useDebouncedValue } from '../../shared/hooks/use-debounced-value';

const DEBOUNCE_DELAY_MS = 200;

describe('Property 9: Debounce Executes Exactly Once Per Pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('for any sequence of input changes followed by a 200ms pause, the debounced value updates exactly once with the final value', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 20 }),
        (inputSequence) => {
          const inputChanges = inputSequence.filter((value, index) => index === 0 || value !== inputSequence[index - 1]);
          const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, DEBOUNCE_DELAY_MS),
            { initialProps: { value: inputChanges[0] } }
          );

          // Rapidly apply all input changes with small intervals (< debounce delay)
          for (let i = 1; i < inputChanges.length; i++) {
            act(() => {
              // Advance a small amount of time (less than debounce delay) between changes
              vi.advanceTimersByTime(50);
            });
            rerender({ value: inputChanges[i] });
          }

          // Record value before the pause completes
          const valueBeforePause = result.current;

          // Now let the full debounce delay elapse with no further changes
          act(() => {
            vi.advanceTimersByTime(DEBOUNCE_DELAY_MS + 1);
          });

          const valueAfterPause = result.current;
          const finalInputValue = inputChanges[inputChanges.length - 1];

          // After the pause, the debounced value should equal the final input value
          expect(valueAfterPause).toBe(finalInputValue);

          // If the sequence has more than one distinct value, the debounced value
          // should have been the initial value before the pause completed
          // (i.e., it didn't update prematurely during rapid changes)
          if (inputChanges.length > 1 && inputChanges[0] !== finalInputValue) {
            // Before the pause, the debounced value should still be the initial value
            // (since no 200ms pause occurred between rapid changes)
            expect(valueBeforePause).toBe(inputChanges[0]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the debounced value does not update during rapid changes (timer resets on each change)', () => {
    fc.assert(
      fc.property(
        // Generate sequences where each consecutive value is distinct to ensure re-renders
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 15 })
          .map(arr => {
            // Ensure consecutive values are distinct so React re-renders each time
            const distinct: string[] = [arr[0]];
            for (let i = 1; i < arr.length; i++) {
              if (arr[i] !== distinct[distinct.length - 1]) {
                distinct.push(arr[i]);
              }
            }
            return distinct;
          })
          .filter(arr => arr.length >= 2),
        (inputSequence) => {
          const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, DEBOUNCE_DELAY_MS),
            { initialProps: { value: inputSequence[0] } }
          );

          const initialDebouncedValue = result.current;

          // Apply changes rapidly — each interval is well under the debounce delay
          // so the timer resets before it can fire
          for (let i = 1; i < inputSequence.length; i++) {
            act(() => {
              vi.advanceTimersByTime(50);
            });
            rerender({ value: inputSequence[i] });

            // During rapid changes, the debounced value should remain the initial value
            // because the timer keeps resetting on each new distinct value
            expect(result.current).toBe(initialDebouncedValue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clearing input (empty string) also debounces with the same 200ms delay', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (initialValue) => {
          const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, DEBOUNCE_DELAY_MS),
            { initialProps: { value: initialValue } }
          );

          // Let initial value settle
          act(() => {
            vi.advanceTimersByTime(DEBOUNCE_DELAY_MS + 1);
          });
          expect(result.current).toBe(initialValue);

          // Clear the input
          rerender({ value: '' });

          // Before debounce delay, value should still be the old value
          act(() => {
            vi.advanceTimersByTime(DEBOUNCE_DELAY_MS - 1);
          });
          expect(result.current).toBe(initialValue);

          // After debounce delay, value should be empty
          act(() => {
            vi.advanceTimersByTime(2);
          });
          expect(result.current).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});
