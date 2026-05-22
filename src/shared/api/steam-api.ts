import {
  buildSteamSearchQueries,
  buildSteamStoreSearchUrl,
  normalizeSteamSearchPayload,
  selectSteamSearchResult
} from '@/core/steam-search';
import { buildSteamReviewsUrl, normalizeSteamReviewSummary } from '@/core/steam-reviews';
import type {
  IgrsGame,
  SteamAppDetailsPayload,
  SteamReviewSummary,
  SteamSearchResult
} from '@/shared/types';

const DEFAULT_PROXY_BASE = 'https://cors.mefi.workers.dev/';

type Translate = (key: string) => string;

interface SteamApiOptions {
  proxyBase?: string;
  t?: Translate;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function proxiedUrl(url: string, proxyBase: string): string {
  return `${proxyBase}${url}`;
}

export function createSteamApi(options: SteamApiOptions = {}) {
  const translate = typeof options.t === 'function' ? options.t : (() => 'Unable to load Steam data.');
  const proxyBase = options.proxyBase || DEFAULT_PROXY_BASE;
  const steamSearchCache = new Map<string, Promise<SteamSearchResult>>();

  async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 10000, fetchOptions: { retries?: number } = {}): Promise<T> {
    const retries = Number.isFinite(fetchOptions.retries) ? Math.max(0, fetchOptions.retries ?? 0) : 2;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(translate('steamchecker.error.load'));
        return await response.json() as T;
      } catch {
        if (attempt >= retries) break;
        const jitter = Math.floor(Math.random() * 80);
        await wait(Math.min(1200, 250 * (2 ** attempt)) + jitter);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    throw new Error(translate('steamchecker.error.load'));
  }

  async function fetchSteamReviewSummary(appId: string): Promise<SteamReviewSummary | null> {
    const reviewUrl = buildSteamReviewsUrl(appId);
    if (!reviewUrl) return null;
    try {
      const payload = await fetchJsonWithTimeout<unknown>(proxiedUrl(reviewUrl, proxyBase), 8000, { retries: 1 });
      return normalizeSteamReviewSummary(payload);
    } catch (error) {
      console.warn('Steam reviews failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  async function findSteamMatchForGame(game: IgrsGame): Promise<SteamSearchResult> {
    const cacheKey = String(game.id || game.name || '');
    if (cacheKey && steamSearchCache.has(cacheKey)) {
      return steamSearchCache.get(cacheKey) as Promise<SteamSearchResult>;
    }

    const searchPromise = (async () => {
      const candidatesById = new Map();
      const queries = buildSteamSearchQueries(game).slice(0, 4);

      for (const query of queries) {
        const searchUrl = buildSteamStoreSearchUrl(query);
        if (!searchUrl) continue;
        try {
          const payload = await fetchJsonWithTimeout<unknown>(proxiedUrl(searchUrl, proxyBase), 6500, { retries: 0 });
          for (const candidate of normalizeSteamSearchPayload(payload)) {
            if (!candidatesById.has(candidate.appId)) candidatesById.set(candidate.appId, candidate);
          }
          const candidates = [...candidatesById.values()];
          const current = selectSteamSearchResult(game, candidates);
          if (current.status === 'match') return current;
        } catch (error) {
          console.warn('Steam search failed:', error instanceof Error ? error.message : error);
        }
      }

      return selectSteamSearchResult(game, [...candidatesById.values()]);
    })();

    if (cacheKey) steamSearchCache.set(cacheKey, searchPromise);
    return searchPromise;
  }

  async function fetchSteamAppDetails(appId: string): Promise<SteamAppDetailsPayload> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}`;
    return fetchJsonWithTimeout<SteamAppDetailsPayload>(proxiedUrl(url, proxyBase));
  }

  return {
    fetchJsonWithTimeout,
    fetchSteamAppDetails,
    fetchSteamReviewSummary,
    findSteamMatchForGame
  };
}
