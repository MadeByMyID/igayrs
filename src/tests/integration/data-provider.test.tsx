import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataProvider, useRequiredIgrsData } from '@/app/providers/data-provider';

/**
 * Integration tests for DataProvider → loadIgrsData flow.
 * Validates: Requirements 39.1, 39.2, 39.3, 39.4
 *
 * Tests cover:
 * 1. Successful data load with valid JSON
 * 2. Network error (fetch rejects or returns non-200)
 * 3. Timeout (fetch exceeds 10 seconds)
 * 4. Malformed JSON (response body is not valid JSON or fails schema validation)
 *
 * All tests mock fetch at the global level — no real network requests.
 */

// Mock the language provider since DataProvider depends on it
vi.mock('@/app/providers/language-provider', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => key,
    toggleLanguage: vi.fn(),
    unlocked: false,
    dictionaryLoading: false,
  }),
}));

// Mock the data-cache to avoid cross-test contamination from module-level cache
vi.mock('@/shared/api/data-cache', () => ({
  createDataCache: () => ({
    get: () => null,
    set: vi.fn(),
    isStale: () => false,
    isFresh: () => false,
    clear: vi.fn(),
  }),
}));

// Valid mock data matching the expected schema
const validMetaPayload = {
  ratings: {
    '7': { name: 'SU', titleEn: 'Everyone', weight: 1 },
  },
  descriptors: {
    '3': { nameEn: 'Violence', nameId: 'Kekerasan' },
  },
  platforms: {
    '1': 'PC',
  },
};

const validGamesPayload = [
  {
    id: 1,
    name: 'Test Game',
    publisherName: 'Test Publisher',
    releaseYear: 2024,
    ratings: [7],
    descriptors: [3],
    platforms: [1],
  },
];

const validSteamMetaPayload = {
  contentDescriptors: {},
};

/** Consuming component that renders data state for assertions. */
function DataConsumer() {
  const { data, error, loading } = useRequiredIgrsData();

  if (loading) {
    return <div role="status" aria-busy="true">Loading data...</div>;
  }

  if (error) {
    return <div role="alert">Error: {error.message}</div>;
  }

  if (data) {
    return (
      <div data-testid="data-loaded">
        <span data-testid="game-count">{data.games.length}</span>
        <span data-testid="first-game-name">{data.games[0]?.name}</span>
      </div>
    );
  }

  return <div>No data</div>;
}

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('DataProvider integration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders data correctly on successful load', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('igrs.meta.json')) return Promise.resolve(createJsonResponse(validMetaPayload));
      if (url.includes('igrs.games.json')) return Promise.resolve(createJsonResponse(validGamesPayload));
      if (url.includes('steam.meta.json')) return Promise.resolve(createJsonResponse(validSteamMetaPayload));
      return Promise.resolve(createJsonResponse(null, 404));
    });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('data-loaded')).toBeInTheDocument();
    });

    expect(screen.getByTestId('game-count')).toHaveTextContent('1');
    expect(screen.getByTestId('first-game-name')).toHaveTextContent('Test Game');
  });

  it('shows error state when fetch returns non-200 status', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('igrs.meta.json')) {
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }
      if (url.includes('igrs.games.json')) return Promise.resolve(createJsonResponse(validGamesPayload));
      if (url.includes('steam.meta.json')) return Promise.resolve(createJsonResponse(validSteamMetaPayload));
      return Promise.resolve(createJsonResponse(null, 404));
    });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Error/);
  });

  it('shows error state when fetch rejects (network failure)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/Error/);
  });

  it('shows error state on timeout', async () => {
    // Simulate the timeout scenario: fetch rejects with AbortError
    // (this is what happens when the 10s timeout fires in fetchJsonResource)
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByRole('alert')).toHaveTextContent(/Error/);
  });

  it('shows error state when response contains malformed JSON', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('igrs.meta.json')) {
        return Promise.resolve(new Response('not valid json {{{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
      if (url.includes('igrs.games.json')) return Promise.resolve(createJsonResponse(validGamesPayload));
      if (url.includes('steam.meta.json')) return Promise.resolve(createJsonResponse(validSteamMetaPayload));
      return Promise.resolve(createJsonResponse(null, 404));
    });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByRole('alert')).toHaveTextContent(/Error/);
  });

  it('shows error state when JSON fails schema validation', async () => {
    const invalidGamesPayload = [
      { id: 'not-a-number', name: 123 },
    ];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('igrs.meta.json')) return Promise.resolve(createJsonResponse(validMetaPayload));
      if (url.includes('igrs.games.json')) return Promise.resolve(createJsonResponse(invalidGamesPayload));
      if (url.includes('steam.meta.json')) return Promise.resolve(createJsonResponse(validSteamMetaPayload));
      return Promise.resolve(createJsonResponse(null, 404));
    });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByRole('alert')).toHaveTextContent(/Error/);
  });

  it('displays loading state before data arrives', async () => {
    let resolveGate!: () => void;
    const gate = new Promise<void>(resolve => { resolveGate = resolve; });

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      await gate;
      if (url.includes('igrs.meta.json')) return createJsonResponse(validMetaPayload);
      if (url.includes('igrs.games.json')) return createJsonResponse(validGamesPayload);
      if (url.includes('steam.meta.json')) return createJsonResponse(validSteamMetaPayload);
      return createJsonResponse(null, 404);
    });

    render(
      <DataProvider>
        <DataConsumer />
      </DataProvider>
    );

    // Loading state should be visible while fetch is pending
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading data...')).toBeInTheDocument();

    // Resolve the pending fetches
    await act(async () => {
      resolveGate();
    });

    // Data should now be displayed
    await waitFor(() => {
      expect(screen.getByTestId('data-loaded')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
