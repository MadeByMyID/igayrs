/**
 * Creates a sliding-window rate limiter that tracks attempts using timestamps.
 *
 * @param maxAttempts - Maximum number of allowed attempts within the window
 * @param windowMs - Duration of the sliding window in milliseconds
 * @returns An object with `attempt()`, `reset()`, and `remaining()` methods
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter(5, 60_000); // 5 attempts per 60s
 * if (limiter.attempt()) {
 *   // action allowed
 * } else {
 *   // rate limited, try again later
 * }
 * ```
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  let timestamps: number[] = [];

  function pruneExpired(now: number): void {
    const cutoff = now - windowMs;
    timestamps = timestamps.filter(ts => ts > cutoff);
  }

  return {
    /**
     * Attempts to record an action. Returns `true` if the action is allowed
     * (under the rate limit), or `false` if the rate limit has been exceeded.
     */
    attempt(): boolean {
      const now = Date.now();
      pruneExpired(now);

      if (timestamps.length >= maxAttempts) {
        return false;
      }

      timestamps.push(now);
      return true;
    },

    /** Clears all recorded attempts, fully resetting the limiter. */
    reset(): void {
      timestamps = [];
    },

    /**
     * Returns the number of attempts remaining in the current window
     * without consuming an attempt.
     */
    remaining(): number {
      const now = Date.now();
      pruneExpired(now);
      return Math.max(0, maxAttempts - timestamps.length);
    },
  };
}
