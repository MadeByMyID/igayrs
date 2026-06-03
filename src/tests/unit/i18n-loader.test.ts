import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nLoader } from '@/core/i18n-loader';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('createI18nLoader', () => {
  it('loads dictionaries from the configured app asset base, not the current route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ loading: 'Memuat...' }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
    globalThis.fetch = fetchMock as typeof fetch;

    const loader = createI18nLoader('/igrs/assets/i18n/');
    const dictionary = await loader.loadDictionary('id');

    expect(fetchMock).toHaveBeenCalledWith('/igrs/assets/i18n/id.json');
    expect(dictionary.loading).toBe('Memuat...');
  });
});
