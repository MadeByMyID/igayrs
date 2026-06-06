import type { IgrsGame, ScoredSteamSearchCandidate, SteamSearchCandidate, SteamSearchResult } from '@/shared/types';
import { ADDON_PENALTIES, STOP_WORDS, WEAK_TITLE_WORDS } from '@/core/search-constants';

const STORE_SEARCH_BASE = 'https://store.steampowered.com/api/storesearch/';

interface SteamSearchPayloadItem {
  id?: unknown;
  name?: unknown;
  type?: unknown;
}

function compactWhitespace(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeSteamSearchText(value: unknown): string {
  return compactWhitespace(
    String(value || '')
      .replace(/&amp;/gi, ' and ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .toLowerCase()
  );
}

function uniquePush(items: string[], item: string): void {
  if (item && !items.includes(item)) items.push(item);
}

function withoutWeakTitleWords(value: unknown): string {
  return compactWhitespace(
    normalizeSteamSearchText(value)
      .split(' ')
      .filter(token => !WEAK_TITLE_WORDS.has(token))
      .join(' ')
  );
}

function baseTitle(value: unknown): string {
  const raw = String(value || '');
  const base = raw.split(/\s[-:|]\s/)[0] || raw;
  return withoutWeakTitleWords(base);
}

function slashTitleParts(value: unknown): string[] {
  return String(value || '')
    .split(/\s*\/\s*/g)
    .map(part => withoutWeakTitleWords(part))
    .filter(part => part.length >= 3);
}

export function buildSteamSearchQueries(game: string | Pick<IgrsGame, 'name'> | null | undefined): string[] {
  const rawName = typeof game === 'string' ? game : game?.name;
  const normalized = normalizeSteamSearchText(rawName);
  const queries: string[] = [];

  uniquePush(queries, normalized);
  for (const part of slashTitleParts(rawName)) {
    uniquePush(queries, part);
  }
  uniquePush(queries, withoutWeakTitleWords(normalized));
  uniquePush(queries, baseTitle(rawName));

  const parts = String(rawName || '').split(/\s[-:|]\s/).map(part => withoutWeakTitleWords(part));
  if (parts.length > 1) {
    uniquePush(queries, withoutWeakTitleWords(parts.join(' ')));
  }

  return queries.filter(query => query.length >= 3);
}

export function buildSteamStoreSearchUrl(query: unknown): string | null {
  const normalized = normalizeSteamSearchText(query);
  if (!normalized) return null;
  return `${STORE_SEARCH_BASE}?term=${encodeURIComponent(normalized)}&l=en&cc=US`;
}

function getPayloadItems(payload: unknown): SteamSearchPayloadItem[] {
  if (payload !== null && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).items)) {
    return (payload as { items: SteamSearchPayloadItem[] }).items;
  }
  return [];
}

export function normalizeSteamSearchPayload(payload: unknown): SteamSearchCandidate[] {
  const items = getPayloadItems(payload);
  const seen = new Set();
  const candidates: SteamSearchCandidate[] = [];

  for (const item of items) {
    const appId = String(item.id || '').trim();
    const name = compactWhitespace(item.name);
    if (!/^\d+$/.test(appId) || !name || item.type !== 'app' || seen.has(appId)) continue;
    seen.add(appId);
    candidates.push({ appId, name, type: 'app' });
  }

  return candidates;
}

function meaningfulTokens(value: unknown): string[] {
  return normalizeSteamSearchText(value)
    .split(' ')
    .filter(token => token && !STOP_WORDS.has(token) && !WEAK_TITLE_WORDS.has(token));
}

function addonPenalty(candidateName: unknown): number {
  const normalized = normalizeSteamSearchText(candidateName);
  for (const entry of ADDON_PENALTIES) {
    if (entry.pattern.test(normalized)) return entry.value;
  }
  return 0;
}

function scoreCandidate(game: Pick<IgrsGame, 'name'>, candidate: SteamSearchCandidate): number {
  const targetTokens = [...new Set(meaningfulTokens(game?.name))];
  const candidateTokens = new Set(meaningfulTokens(candidate?.name));
  if (!targetTokens.length || !candidateTokens.size) return 0;

  const matches = targetTokens.filter(token => candidateTokens.has(token));
  let score = Math.round((matches.length / targetTokens.length) * 100);
  const targetHasSubtitle = /\s[-:|]\s/.test(String(game?.name || ''));
  const candidateName = normalizeSteamSearchText(candidate?.name);

  if (targetHasSubtitle && /\b(expansion|dlc)\b/.test(candidateName)) score += 6;
  if (slashTitleParts(game?.name).includes(candidateName)) score += 15;
  score -= addonPenalty(candidate?.name);

  if (candidateName === normalizeSteamSearchText(game?.name)) score += 10;
  return Math.max(0, Math.min(120, score));
}

export function selectSteamSearchResult(game: Pick<IgrsGame, 'name'>, candidates: SteamSearchCandidate[]): SteamSearchResult {
  const scored = (Array.isArray(candidates) ? candidates : [])
    .map(candidate => ({
      ...candidate,
      score: scoreCandidate(game, candidate)
    }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  if (!scored.length) {
    return { status: 'none', match: null, candidates: [] };
  }

  const top = scored[0] as ScoredSteamSearchCandidate;
  if (top.score >= 80) {
    return { status: 'match', match: top, candidates: scored.slice(0, 3) };
  }

  return { status: 'ambiguous', match: null, candidates: scored.slice(0, 3) };
}
