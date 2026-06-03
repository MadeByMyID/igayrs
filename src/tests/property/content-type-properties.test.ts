// Feature: igrs-codebase-improvements, Property 13: CORS Proxy Content-Type Validation
// **Validates: Requirements 20.1, 20.2**

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { createSteamApi } from '@/shared/api/steam-api';

// --- Test Helpers ---

const TEST_PROXY_BASE = 'https://cors.mefi.workers.dev/';

// --- Generators ---

/** Generates arbitrary Content-Type strings that do NOT contain "application/json" */
function nonJsonContentType(): fc.Arbitrary<string> {
  return fc.oneof(
    // Common non-JSON content types
    fc.constantFrom(
      'text/html',
      'text/plain',
      'text/xml',
      'application/xml',
      'application/octet-stream',
      'image/png',
      'image/jpeg',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
      'text/css',
      'application/javascript',
      'text/html; charset=utf-8',
      'text/plain; charset=utf-8',
      'application/pdf',
      'application/zip'
    ),
    // Random strings that don't contain "application/json"
    fc.string({ minLength: 1, maxLength: 60 })
      .filter(s => !s.toLowerCase().includes('application/json'))
  );
}

/** Generates Content-Type strings that DO contain "application/json" */
function jsonContentType(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant('application/json'),
    fc.constant('application/json; charset=utf-8'),
    fc.constant('application/json;charset=UTF-8'),
    fc.constantFrom(
      'application/json; charset=utf-8',
      'application/json;charset=UTF-8',
      'application/json; boundary=something',
      'application/json; profile="http://example.com"'
    )
  );
}

// --- Property Tests ---

describe('Property 13: CORS Proxy Content-Type Validation', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('never parses response body when Content-Type does not contain application/json', async () => {
    await fc.assert(
      fc.asyncProperty(nonJsonContentType(), async (contentType) => {
        // Track whether response.json() is ever called
        const jsonSpy = vi.fn();
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'content-type': contentType }),
          json: jsonSpy
        };

        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // Use fetchJsonWithTimeout with 0 retries to isolate the Content-Type check
        try {
          await api.fetchJsonWithTimeout('https://example.com/api', 10000, { retries: 0 });
        } catch {
          // Expected to throw — the key property is below
        }

        // The critical property: response.json() was NEVER called
        // This proves the client rejects rather than attempting to parse
        expect(jsonSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects with an error when Content-Type does not contain application/json', async () => {
    await fc.assert(
      fc.asyncProperty(nonJsonContentType(), async (contentType) => {
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'content-type': contentType }),
          json: vi.fn().mockResolvedValue({})
        };

        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // The function must reject — it should not resolve successfully
        let rejected = false;
        try {
          await api.fetchJsonWithTimeout('https://example.com/api', 10000, { retries: 0 });
        } catch {
          rejected = true;
        }

        expect(rejected).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('rejects when Content-Type header is missing entirely', async () => {
    const jsonSpy = vi.fn();
    const mockResponse = {
      ok: true,
      headers: new Headers(), // No content-type header
      json: jsonSpy
    };

    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const api = createSteamApi({
      proxyBase: TEST_PROXY_BASE,
      proxyAllowlist: [TEST_PROXY_BASE]
    });

    let rejected = false;
    try {
      await api.fetchJsonWithTimeout('https://example.com/api', 10000, { retries: 0 });
    } catch {
      rejected = true;
    }

    expect(rejected).toBe(true);
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('successfully parses response body when Content-Type contains application/json', async () => {
    const validBody = { appId: '12345', success: true, data: { name: 'Test Game' } };

    await fc.assert(
      fc.asyncProperty(jsonContentType(), async (contentType) => {
        const jsonSpy = vi.fn().mockResolvedValue(validBody);
        const mockResponse = {
          ok: true,
          headers: new Headers({ 'content-type': contentType }),
          json: jsonSpy
        };

        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const api = createSteamApi({
          proxyBase: TEST_PROXY_BASE,
          proxyAllowlist: [TEST_PROXY_BASE]
        });

        // With valid Content-Type, the response should be parsed and returned
        const result = await api.fetchJsonWithTimeout(
          'https://example.com/api', 10000, { retries: 0 }
        );

        expect(result).toEqual(validBody);
        // response.json() WAS called — proving it attempts to parse
        expect(jsonSpy).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
