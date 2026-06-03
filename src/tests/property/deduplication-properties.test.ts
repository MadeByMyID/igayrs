// Feature: igrs-codebase-improvements, Property 7: Steam API Request Deduplication
// **Validates: Requirements 15.1, 15.2, 15.3, 15.5**

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { createSteamApi } from '../../shared/api/steam-api';

// --- Test Helpers ---

const TEST_PROXY_BASE = 'https://cors.mefi.workers.dev/';

function createMockResponse(appId: string) {
  return {
    [appId]: {
      success: true,
      data: { steam_appid: Number(appId) || 0, name: `Game ${appId}` }
    }
  };
}

// --- Generators ---

/** Generates random app ID strings that are valid for Steam API lookups */
function appIdArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    // Numeric app IDs (most common)
    fc.integer({ min: 1, max: 9999999 }).map(String),
    // String-based app IDs with alphanumeric characters
    fc.stringMatching(/^[a-z0-9]{1,12}$/)
  );
}

/** Generates the number of concurrent callers (2 to 8) */
function concurrentCallersArbitrary(): fc.Arbitrary<number> {
  return fc.integer({ min: 2, max: 8 });
}

// --- Property Tests ---

describe('Property 7: Steam API Request Deduplication', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('issues exactly one network request when multiple concurrent callers use the same app ID', async () => {
    await fc.assert(
      fc.asyncProperty(appIdArbitrary(), concurrentCallersArbitrary(), async (appId, callerCount) => {
        const fetchSpy = vi.fn().mockImplementation(() =>
          Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve(createMockResponse(appId))
          })
        );
        globalThis.fetch = fetchSpy;

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // Fire all calls concurrently with the same app ID
        const promises = Array.from({ length: callerCount }, () =>
          api.fetchSteamAppDetails(appId)
        );

        await Promise.all(promises);

        // The critical property: exactly 1 network request was made
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 }
    );
  });

  it('all concurrent callers receive the same resolved value', async () => {
    await fc.assert(
      fc.asyncProperty(appIdArbitrary(), concurrentCallersArbitrary(), async (appId, callerCount) => {
        const responseData = createMockResponse(appId);

        globalThis.fetch = vi.fn().mockImplementation(() =>
          Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve(responseData)
          })
        );

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // Fire all calls concurrently
        const promises = Array.from({ length: callerCount }, () =>
          api.fetchSteamAppDetails(appId)
        );

        const results = await Promise.all(promises);

        // All callers must receive the same resolved value
        for (let i = 1; i < results.length; i++) {
          expect(results[i]).toEqual(results[0]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all concurrent callers receive the same rejection when the request fails', async () => {
    // Use fake timers to avoid real delays from retry backoff
    vi.useFakeTimers();

    await fc.assert(
      fc.asyncProperty(appIdArbitrary(), concurrentCallersArbitrary(), async (appId, callerCount) => {
        globalThis.fetch = vi.fn().mockImplementation(() =>
          Promise.resolve({
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({})
          })
        );

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // Fire all calls concurrently
        const promises = Array.from({ length: callerCount }, () =>
          api.fetchSteamAppDetails(appId).catch((error: Error) => error)
        );

        // Advance timers to flush all retry delays
        await vi.runAllTimersAsync();

        const results = await Promise.all(promises);

        // All callers must receive a rejection (Error instance)
        for (const result of results) {
          expect(result).toBeInstanceOf(Error);
        }

        // All callers receive the same error message
        const firstMessage = (results[0] as Error).message;
        for (let i = 1; i < results.length; i++) {
          expect((results[i] as Error).message).toBe(firstMessage);
        }
      }),
      { numRuns: 100 }
    );

    vi.useRealTimers();
  });

  it('subsequent calls after resolution initiate a new network request', async () => {
    await fc.assert(
      fc.asyncProperty(appIdArbitrary(), async (appId) => {
        const fetchSpy = vi.fn().mockImplementation(() =>
          Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve(createMockResponse(appId))
          })
        );
        globalThis.fetch = fetchSpy;

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // First batch of concurrent calls
        const firstBatch = Array.from({ length: 3 }, () =>
          api.fetchSteamAppDetails(appId)
        );
        await Promise.all(firstBatch);

        // After resolution, a new call should trigger a new fetch
        await api.fetchSteamAppDetails(appId);

        // Two separate network requests: one for the first batch, one for the subsequent call
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      }),
      { numRuns: 100 }
    );
  });

  it('uses exact string equality after encoding for deduplication key', async () => {
    await fc.assert(
      fc.asyncProperty(appIdArbitrary(), async (appId) => {
        const fetchSpy = vi.fn().mockImplementation(() =>
          Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve(createMockResponse(appId))
          })
        );
        globalThis.fetch = fetchSpy;

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // Two concurrent calls with the exact same app ID string
        const [result1, result2] = await Promise.all([
          api.fetchSteamAppDetails(appId),
          api.fetchSteamAppDetails(appId)
        ]);

        // Same string → deduplicated → 1 fetch call
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        // Both receive the same value
        expect(result1).toEqual(result2);
      }),
      { numRuns: 100 }
    );
  });
});
