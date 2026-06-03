import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createRateLimiter } from '../../shared/lib/rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows attempts up to the maximum', () => {
    const limiter = createRateLimiter(5, 60_000);

    for (let i = 0; i < 5; i++) {
      expect(limiter.attempt()).toBe(true);
    }
  });

  it('rejects attempts beyond the maximum within the window', () => {
    const limiter = createRateLimiter(5, 60_000);

    for (let i = 0; i < 5; i++) {
      limiter.attempt();
    }

    expect(limiter.attempt()).toBe(false);
    expect(limiter.attempt()).toBe(false);
  });

  it('allows attempts again after the window expires', () => {
    const limiter = createRateLimiter(5, 60_000);

    for (let i = 0; i < 5; i++) {
      limiter.attempt();
    }

    expect(limiter.attempt()).toBe(false);

    // Advance past the 60-second window
    vi.advanceTimersByTime(60_001);

    expect(limiter.attempt()).toBe(true);
  });

  it('uses a sliding window (oldest attempts expire individually)', () => {
    const limiter = createRateLimiter(3, 10_000);

    // Attempt at t=0
    limiter.attempt();
    vi.advanceTimersByTime(3_000);

    // Attempt at t=3000
    limiter.attempt();
    vi.advanceTimersByTime(3_000);

    // Attempt at t=6000
    limiter.attempt();

    // All 3 slots used
    expect(limiter.attempt()).toBe(false);

    // Advance to t=10001 — first attempt (t=0) expires
    vi.advanceTimersByTime(4_001);
    expect(limiter.attempt()).toBe(true);

    // Now at capacity again (t=3000, t=6000, t=10001)
    expect(limiter.attempt()).toBe(false);
  });

  it('reset clears all attempts', () => {
    const limiter = createRateLimiter(2, 60_000);

    limiter.attempt();
    limiter.attempt();
    expect(limiter.attempt()).toBe(false);

    limiter.reset();
    expect(limiter.attempt()).toBe(true);
    expect(limiter.attempt()).toBe(true);
  });

  it('remaining returns correct count when no attempts made', () => {
    const limiter = createRateLimiter(5, 60_000);
    expect(limiter.remaining()).toBe(5);
  });

  it('remaining decreases with each attempt', () => {
    const limiter = createRateLimiter(5, 60_000);

    limiter.attempt();
    expect(limiter.remaining()).toBe(4);

    limiter.attempt();
    expect(limiter.remaining()).toBe(3);
  });

  it('remaining returns 0 when limit is reached', () => {
    const limiter = createRateLimiter(3, 60_000);

    limiter.attempt();
    limiter.attempt();
    limiter.attempt();

    expect(limiter.remaining()).toBe(0);
  });

  it('remaining recovers after window expires', () => {
    const limiter = createRateLimiter(3, 10_000);

    limiter.attempt();
    limiter.attempt();
    limiter.attempt();
    expect(limiter.remaining()).toBe(0);

    vi.advanceTimersByTime(10_001);
    expect(limiter.remaining()).toBe(3);
  });

  it('works with maxAttempts of 1', () => {
    const limiter = createRateLimiter(1, 5_000);

    expect(limiter.attempt()).toBe(true);
    expect(limiter.attempt()).toBe(false);

    vi.advanceTimersByTime(5_001);
    expect(limiter.attempt()).toBe(true);
  });

  it('remaining does not consume an attempt', () => {
    const limiter = createRateLimiter(5, 60_000);

    limiter.remaining();
    limiter.remaining();
    limiter.remaining();

    // All 5 attempts should still be available
    expect(limiter.remaining()).toBe(5);
    expect(limiter.attempt()).toBe(true);
  });
});
