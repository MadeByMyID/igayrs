import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSteamApi } from '@/shared/api/steam-api';
import type { IgrsGame } from '@/shared/types';

const TEST_PROXY_BASE = 'https://cors.mefi.workers.dev/';

const game: IgrsGame = {
  id: 2682120,
  name: 'Bioskop Simulator / Movie Cinema Simulator',
  publisherName: 'Test Publisher',
  releaseYear: 2026,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  });
}

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    reject = nextReject;
    resolve = nextResolve;
  });
  return { promise, reject, resolve };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createSteamApi', () => {
  it('starts a fresh details request when the previous same-app caller was aborted before cleanup settles', async () => {
    const firstFetch = deferred<Response>();
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce((_url, init) => {
        const signal = init?.signal;
        signal?.addEventListener('abort', () => {
          firstFetch.reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
        return firstFetch.promise;
      })
      .mockResolvedValueOnce(jsonResponse({
        2391960: { success: true, data: { name: 'Recovered Steam Game' } },
      }));

    const api = createSteamApi({
      proxyAllowlist: [TEST_PROXY_BASE],
      proxyBase: TEST_PROXY_BASE,
    });
    const firstCaller = new AbortController();
    const firstPromise = api
      .fetchSteamAppDetails('2391960', { signal: firstCaller.signal })
      .catch(error => error);

    firstCaller.abort();
    const secondPromise = api.fetchSteamAppDetails('2391960');

    await expect(secondPromise).resolves.toEqual({
      2391960: { success: true, data: { name: 'Recovered Steam Game' } },
    });
    await expect(firstPromise).resolves.toBeInstanceOf(DOMException);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not warn when Steam search recovers from one failed query and finds a later match', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('temporary proxy failure'))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ id: 2682120, name: 'Movie Cinema Simulator', type: 'app' }],
      }));

    const api = createSteamApi({
      proxyAllowlist: [TEST_PROXY_BASE],
      proxyBase: TEST_PROXY_BASE,
    });

    const result = await api.findSteamMatchForGame(game);

    expect(result.status).toBe('match');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
