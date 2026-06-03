/**
 * Steam-specific domain logic: app ID parsing, rating conversion, game matching, comparison.
 */
import { normalizeSearchText } from '@/shared/lib/text';
import { descriptorName, ratingWeight } from '@/shared/lib/ratings';
import type { IgrsGame, IgrsMeta, Language, SteamGameDetails, SteamMeta, SteamRatingPayload } from '@/shared/types';

export function parseSteamAppId(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) return text;

  const STEAM_HOSTS = ['store.steampowered.com', 'steamcommunity.com'];
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(text);
  } catch { /* not a URL, try regex patterns below */ }

  if (parsedUrl && !STEAM_HOSTS.some(host => parsedUrl!.hostname === host || parsedUrl!.hostname.endsWith(`.${host}`))) {
    const appidParam = parsedUrl.searchParams.get('appid') || parsedUrl.searchParams.get('appids');
    return appidParam && /^\d+$/.test(appidParam) ? appidParam : '';
  }

  const patterns = [
    /steamcommunity\.com\/app\/(\d+)/i,
    /store\.steampowered\.com\/app\/(\d+)/i,
    /store\.steampowered\.com\/agecheck\/app\/(\d+)/i,
    /[?&]appid=(\d+)/i,
    /[?&]appids=(\d+)/i,
    /\/app\/(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

export function parseSteamRatingFlag(value: unknown): boolean {
  return String(value) === '1' || value === true;
}

export function steamRatingToIgrsId(steamRating: SteamRatingPayload | null | undefined): number | null {
  const rating = String(steamRating?.rating || '').trim().toUpperCase();
  if (!rating) return null;
  if (rating === 'BANNED' || parseSteamRatingFlag(steamRating?.banned)) return 35;

  const byRating: Record<string, number> = {
    '0': 7, '3': 7, '3+': 7,
    '7': 4, '7+': 4,
    '13': 5, '13+': 5,
    '15': 28, '15+': 28,
    '18': 6, '18+': 6,
    RC: 35
  };

  if (byRating[rating]) return byRating[rating];
  const age = Number(steamRating?.required_age);
  if (age >= 18) return 6;
  if (age >= 15) return 28;
  if (age >= 13) return 5;
  if (age >= 7) return 4;
  if (age >= 3) return 7;
  return null;
}

export function findGameByName(games: IgrsGame[], name: unknown, fuzzyScore: (query: string, text: string) => number, nameIndex?: Map<string, IgrsGame>): IgrsGame | null {
  if (!games.length || !name) return null;
  const normalized = normalizeSearchText(name);

  if (nameIndex) {
    const exact = nameIndex.get(normalized);
    if (exact) return exact;
  }

  let fallback: IgrsGame | null = null;
  let fallbackScore = 0;
  for (const game of games) {
    const candidate = normalizeSearchText(game.name);
    if (candidate === normalized) return game;
    const score = fuzzyScore(normalized, candidate);
    if (score > fallbackScore) {
      fallbackScore = score;
      fallback = game;
    }
  }
  return fallbackScore >= 70 ? fallback : null;
}

export function getSteamDescriptorMeta(steamMeta: SteamMeta, id: number) {
  return steamMeta.contentDescriptors[String(id)] || null;
}

export function computeSteamChecker(meta: IgrsMeta, steamMeta: SteamMeta, steamGame: SteamGameDetails | null | undefined) {
  const descriptorIds = Array.isArray(steamGame?.content_descriptors?.ids)
    ? steamGame.content_descriptors.ids.map(id => Number(id)).filter(Number.isFinite)
    : [];
  const mappedDescriptors = [];
  const mappedDescriptorIds: number[] = [];
  let computedRatingId = 7;

  for (const descriptorId of descriptorIds) {
    const descriptorMeta = getSteamDescriptorMeta(steamMeta, descriptorId);
    if (!descriptorMeta) continue;
    mappedDescriptors.push({ id: descriptorId, ...descriptorMeta });
    for (const igrsId of descriptorMeta.igrsDescriptorIds || []) {
      const numericId = Number(igrsId);
      if (Number.isFinite(numericId) && !mappedDescriptorIds.includes(numericId)) {
        mappedDescriptorIds.push(numericId);
      }
    }
    if (descriptorMeta.ratingId && ratingWeight(meta, descriptorMeta.ratingId) > ratingWeight(meta, computedRatingId)) {
      computedRatingId = descriptorMeta.ratingId;
    }
  }

  return { computedRatingId, descriptorIds, mappedDescriptorIds, mappedDescriptors };
}

interface SteamRatingComparisonInput {
  computedDescriptorIds: number[];
  computedRatingId: number | null;
  localDescriptorIds: number[];
  localRatingId: number | null;
  steamDescriptorIds: number[];
  steamRatingId: number | null;
}

export interface SteamRatingComparison {
  descriptorStatus: 'match' | 'missing-local' | 'missing-steam' | 'mismatch' | 'unknown';
  missingFromSteamDescriptorIds: number[];
  ratingStatus: 'match' | 'missing-local' | 'missing-steam' | 'mismatch' | 'unknown';
  unexpectedSteamDescriptorIds: number[];
}

function uniqueSortedNumbers(values: number[]): number[] {
  return [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
}

function difference(left: number[], right: number[]): number[] {
  const rightSet = new Set(right);
  return left.filter(value => !rightSet.has(value));
}

export function buildSteamRatingComparison(input: SteamRatingComparisonInput): SteamRatingComparison {
  const localDescriptors = uniqueSortedNumbers(input.localDescriptorIds);
  const steamDescriptors = uniqueSortedNumbers(input.steamDescriptorIds.length ? input.steamDescriptorIds : input.computedDescriptorIds);
  const missingFromSteamDescriptorIds = difference(localDescriptors, steamDescriptors);
  const unexpectedSteamDescriptorIds = difference(steamDescriptors, localDescriptors);

  let ratingStatus: SteamRatingComparison['ratingStatus'] = 'unknown';
  if (input.localRatingId && input.steamRatingId) ratingStatus = input.localRatingId === input.steamRatingId ? 'match' : 'mismatch';
  else if (input.localRatingId && input.computedRatingId) ratingStatus = input.localRatingId === input.computedRatingId ? 'match' : 'mismatch';
  else if (input.localRatingId) ratingStatus = 'missing-steam';
  else if (input.steamRatingId || input.computedRatingId) ratingStatus = 'missing-local';

  let descriptorStatus: SteamRatingComparison['descriptorStatus'] = 'unknown';
  if (localDescriptors.length || steamDescriptors.length) {
    if (!localDescriptors.length) descriptorStatus = 'missing-local';
    else if (!steamDescriptors.length) descriptorStatus = 'missing-steam';
    else if (!missingFromSteamDescriptorIds.length && !unexpectedSteamDescriptorIds.length) descriptorStatus = 'match';
    else if (missingFromSteamDescriptorIds.length && !unexpectedSteamDescriptorIds.length) descriptorStatus = 'missing-steam';
    else if (!missingFromSteamDescriptorIds.length && unexpectedSteamDescriptorIds.length) descriptorStatus = 'missing-local';
    else descriptorStatus = 'mismatch';
  }

  return { descriptorStatus, missingFromSteamDescriptorIds, ratingStatus, unexpectedSteamDescriptorIds };
}

export function steamIgrsDescriptorIdsFromText(meta: IgrsMeta, text: unknown, lang: Language): number[] {
  if (!text || !meta.descriptors) return [];
  const lines = String(text)
    .split(/\r?\n/g)
    .map(line => normalizeSearchText(line))
    .filter(Boolean);
  if (!lines.length) return [];

  const ids: number[] = [];
  for (const line of lines) {
    for (const [id, descriptor] of Object.entries(meta.descriptors)) {
      const variants = [descriptor.nameId, descriptor.nameEn]
        .map(value => normalizeSearchText(value))
        .filter(Boolean);
      if (!variants.length) continue;
      if (variants.some(variant => variant === line || variant.includes(line) || line.includes(variant))) {
        const numericId = Number(id);
        if (Number.isFinite(numericId) && !ids.includes(numericId)) ids.push(numericId);
      }
    }
  }
  return ids.sort((a, b) => descriptorName(meta, a, lang).localeCompare(descriptorName(meta, b, lang)));
}
