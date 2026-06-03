// @vitest-environment node
import { describe, expect, it } from 'vitest';
import workerModule from '../../../ops/worker/worker.ts';

interface WorkerModule {
  fetch(request: Request, env: Record<string, string>): Promise<Response>;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

describe('worker data cache', () => {
  it('reuses game data across preview and oEmbed requests', async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    const games = [
      {
        id: 101,
        name: 'Cached Preview',
        publisherName: 'Perf Studio',
        releaseYear: 2026,
        ratings: [7],
        descriptors: [3],
        description: 'A preview card fixture.'
      },
      {
        id: 202,
        name: 'Cached OEmbed',
        publisherName: 'Perf Studio',
        releaseYear: 2025,
        ratings: [6],
        descriptors: [],
        description: 'A second fixture.'
      }
    ];
    const meta = {
      ratings: {
        7: { name: 'SU' },
        6: { name: '18+' }
      },
      descriptors: {
        3: { nameEn: 'Violence', nameId: 'Kekerasan' }
      },
      platforms: {}
    };

    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const href = String(url);
      calls.push(href);
      if (href === 'https://site.test/games.json') return jsonResponse(games);
      if (href === 'https://site.test/meta.json') return jsonResponse(meta);
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    try {
      const worker = workerModule as unknown as WorkerModule;
      const env = {
        SITE_ORIGIN: 'https://site.test',
        GAMES_PATH: '/games.json',
        META_PATH: '/meta.json'
      };
      const botHeaders = { 'user-agent': 'Discordbot/2.0' };

      const first = await worker.fetch(new Request('https://worker.test/game/101', { headers: botHeaders }), env);
      expect(first.status).toBe(200);
      expect(await first.text()).toContain('Cached Preview');

      const second = await worker.fetch(new Request('https://worker.test/game/202/oembed'), env);
      expect(second.status).toBe(200);
      expect((await second.json()).title).toBe('Cached OEmbed');

      expect(calls).toEqual(['https://site.test/games.json', 'https://site.test/meta.json']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('passes abort signals to upstream dataset fetches', async () => {
    const originalFetch = globalThis.fetch;
    const signals: Array<AbortSignal | undefined> = [];
    const games = [{ id: 303, name: 'Signal Preview', publisherName: 'Ops Studio', releaseYear: 2026, ratings: [7] }];
    const meta = { ratings: { 7: { name: 'SU' } }, descriptors: {}, platforms: {} };

    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init?.signal ?? undefined);
      const href = String(url);
      if (href === 'https://signal.test/games.json') return jsonResponse(games);
      if (href === 'https://signal.test/meta.json') return jsonResponse(meta);
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    try {
      const worker = workerModule as unknown as WorkerModule;
      const response = await worker.fetch(new Request('https://worker.test/game/303', {
        headers: { 'user-agent': 'Discordbot/2.0' }
      }), {
        SITE_ORIGIN: 'https://signal.test',
        GAMES_PATH: '/games.json',
        META_PATH: '/meta.json'
      });

      expect(response.status).toBe(200);
      expect(signals).toHaveLength(2);
      expect(signals.every(signal => signal instanceof AbortSignal)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
