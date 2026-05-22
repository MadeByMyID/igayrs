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
const DEFAULT_PROXY_ALLOWLIST = [DEFAULT_PROXY_BASE];

type Translate = (key: string) => string;

interface SteamApiOptions {
  proxyAllowlist?: string[];
  proxyBase?: string;
  t?: Translate;
}

interface SteamFetchOptions {
  retries?: number;
  signal?: AbortSignal;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function proxiedUrl(url: string, proxyBase: string): string {
  return `${proxyBase}${url}`;
}

function normalizedHref(value: string): string {
  const url = new URL(value);
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

export function normalizeSteamProxyBase(value?: string, allowlist: string[] = DEFAULT_PROXY_ALLOWLIST): string {
  const candidate = value?.trim() || DEFAULT_PROXY_BASE;
  let normalized: string;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') throw new Error('STEAM_PROXY_INSECURE');
    normalized = normalizedHref(url.href);
  } catch (error) {
    if (error instanceof Error && error.message === 'STEAM_PROXY_INSECURE') throw error;
    throw new Error('STEAM_PROXY_INVALID', { cause: error });
  }

  const allowed = new Set(allowlist.map(item => normalizedHref(item)));
  if (!allowed.has(normalized)) throw new Error('STEAM_PROXY_NOT_ALLOWED');
  return normalized;
}

function createLinkedAbortController(signal?: AbortSignal): { cleanup: () => void; controller: AbortController } {
  const controller = new AbortController();
  if (!signal) return { controller, cleanup: () => undefined };

  const abort = () => controller.abort();
  if (signal.aborted) {
    controller.abort();
    return { controller, cleanup: () => undefined };
  }

  signal.addEventListener('abort', abort, { once: true });
  return {
    controller,
    cleanup: () => signal.removeEventListener('abort', abort)
  };
}

export function createSteamApi(options: SteamApiOptions = {}) {
  const translate = typeof options.t === 'function' ? options.t : (() => 'Unable to load Steam data.');
  const proxyBase = normalizeSteamProxyBase(
    options.proxyBase || import.meta.env.VITE_STEAM_PROXY_BASE,
    options.proxyAllowlist || DEFAULT_PROXY_ALLOWLIST
  );
  const steamSearchCache = new Map<string, Promise<SteamSearchResult>>();

  async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 10000, fetchOptions: SteamFetchOptions = {}): Promise<T> {
    const retries = Number.isFinite(fetchOptions.retries) ? Math.max(0, fetchOptions.retries ?? 0) : 2;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const { controller, cleanup } = createLinkedAbortController(fetchOptions.signal);
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
        cleanup();
      }
    }

    throw new Error(translate('steamchecker.error.load'));
  }

  async function fetchSteamReviewSummary(appId: string, fetchOptions: SteamFetchOptions = {}): Promise<SteamReviewSummary | null> {
    const reviewUrl = buildSteamReviewsUrl(appId);
    if (!reviewUrl) return null;
    try {
      const payload = await fetchJsonWithTimeout<unknown>(proxiedUrl(reviewUrl, proxyBase), 8000, { retries: 1, signal: fetchOptions.signal });
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

  async function fetchSteamAppDetails(appId: string, fetchOptions: SteamFetchOptions = {}): Promise<SteamAppDetailsPayload> {
    const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}`;
    return fetchJsonWithTimeout<SteamAppDetailsPayload>(proxiedUrl(url, proxyBase), 10000, { signal: fetchOptions.signal });
  }

  return {
    fetchJsonWithTimeout,
    fetchSteamAppDetails,
    fetchSteamReviewSummary,
    findSteamMatchForGame
  };
}
