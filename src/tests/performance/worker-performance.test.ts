// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

interface WorkerModule {
  fetch(request: Request, env: Record<string, string>): Promise<Response>;
}

function loadWorker(): WorkerModule {
  const workerPath = path.join(ROOT, 'ops/worker/worker.js');
  const source = fs.readFileSync(workerPath, 'utf8').replace('export default', 'module.exports =');
  const context = {
    module: { exports: {} },
    exports: {},
    URL,
    Request,
    Response,
    console,
    fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args)
  };
  vm.runInNewContext(source, context, { filename: workerPath });
  return context.module.exports as WorkerModule;
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
      const worker = loadWorker();
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
});
