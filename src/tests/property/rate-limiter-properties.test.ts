// Feature: igrs-codebase-improvements, Property 10: Rate Limiter Enforcement
// **Validates: Requirements 23.1, 23.2**

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createRateLimiter } from '../../shared/lib/rate-limiter';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Property 10: Rate Limiter Enforcement', () => {
  it('allows exactly the first maxAttempts calls and rejects all subsequent calls within the window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 120000 }),
        fc.integer({ min: 1, max: 20 }),
        (maxAttempts, windowMs, extraAttempts) => {
          const totalAttempts = maxAttempts + extraAttempts;

          // Fix Date.now to a constant value within the window
          const now = 1000000;
          vi.spyOn(Date, 'now').mockReturnValue(now);

          const limiter = createRateLimiter(maxAttempts, windowMs);

          const results: boolean[] = [];
          for (let i = 0; i < totalAttempts; i++) {
            results.push(limiter.attempt());
          }

          // Exactly the first maxAttempts should be allowed
          const allowedCount = results.filter(r => r === true).length;
          expect(allowedCount).toBe(maxAttempts);

          // The first maxAttempts should all be true
          for (let i = 0; i < maxAttempts; i++) {
            expect(results[i]).toBe(true);
          }

          // All subsequent attempts should be false
          for (let i = maxAttempts; i < totalAttempts; i++) {
            expect(results[i]).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows attempts again after the window expires', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 120000 }),
        (maxAttempts, windowMs) => {
          let currentTime = 1000000;
          vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

          const limiter = createRateLimiter(maxAttempts, windowMs);

          // Exhaust all attempts
          for (let i = 0; i < maxAttempts; i++) {
            expect(limiter.attempt()).toBe(true);
          }

          // Next attempt should be rejected
          expect(limiter.attempt()).toBe(false);

          // Advance time past the window
          currentTime += windowMs + 1;

          // Attempts should be allowed again
          expect(limiter.attempt()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('remaining() reports correct count without consuming attempts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 120000 }),
        fc.integer({ min: 0, max: 10 }),
        (maxAttempts, windowMs, attemptsToMake) => {
          const actualAttempts = Math.min(attemptsToMake, maxAttempts);

          const now = 1000000;
          vi.spyOn(Date, 'now').mockReturnValue(now);

          const limiter = createRateLimiter(maxAttempts, windowMs);

          // Make some attempts
          for (let i = 0; i < actualAttempts; i++) {
            limiter.attempt();
          }

          // remaining() should reflect how many are left
          const expectedRemaining = maxAttempts - actualAttempts;
          expect(limiter.remaining()).toBe(expectedRemaining);

          // Calling remaining() again should give the same result (no side effect)
          expect(limiter.remaining()).toBe(expectedRemaining);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reset() clears all attempts and allows full window again', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1000, max: 120000 }),
        (maxAttempts, windowMs) => {
          const now = 1000000;
          vi.spyOn(Date, 'now').mockReturnValue(now);

          const limiter = createRateLimiter(maxAttempts, windowMs);

          // Exhaust all attempts
          for (let i = 0; i < maxAttempts; i++) {
            limiter.attempt();
          }
          expect(limiter.attempt()).toBe(false);

          // Reset the limiter
          limiter.reset();

          // Should allow maxAttempts again
          for (let i = 0; i < maxAttempts; i++) {
            expect(limiter.attempt()).toBe(true);
          }
          expect(limiter.attempt()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
