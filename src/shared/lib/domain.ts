import { EXTRA_FIELD_PATCHED_LEGACY_TEXT, EXTRA_FIELD_PATCHED_TOKEN, IMAGE_BASE } from '@/core/constants';
import { normalizeSearchText } from '@/core/search-index';
import { safeHttpUrl } from '@/core/safe-render';
import type {
  IgrsGame,
  IgrsMeta,
  Language,
  SteamGameDetails,
  SteamMeta,
  SteamRatingPayload
} from '@/shared/types';

export const IMG_RATING = (id: number): string => `${IMAGE_BASE}/ratings/${id}.png`;
export const IMG_DESCRIPTOR = (id: number): string => `${IMAGE_BASE}/descriptors/cc-${id}.png`;

export function ratingName(meta: IgrsMeta, id: number): string {
  return meta.ratings[String(id)]?.name || '?';
}

export function ratingWeight(meta: IgrsMeta, id: number): number {
  return meta.ratings[String(id)]?.weight || 0;
}

export function ratingTitle(meta: IgrsMeta, id: number, lang: Language): string {
  const rating = meta.ratings[String(id)];
  if (!rating) return '';
  return lang === 'id'
    ? rating.titleId || rating.titleEn || rating.name
    : rating.titleEn || rating.titleId || rating.name;
}

export function ratingContent(meta: IgrsMeta, id: number, lang: Language): string {
  const rating = meta.ratings[String(id)];
  if (!rating) return '';
  return lang === 'id'
    ? rating.contentId || rating.contentEn || ''
    : rating.contentEn || rating.contentId || '';
}

export function descriptorName(meta: IgrsMeta, id: number, lang: Language): string {
  const descriptor = meta.descriptors[String(id)];
  if (!descriptor) return '?';
  return lang === 'id'
    ? descriptor.nameId || descriptor.nameEn || '?'
    : descriptor.nameEn || descriptor.nameId || '?';
}

export function platformName(meta: IgrsMeta, id: number, lang: Language): string {
  const platform = meta.platforms[String(id)];
  if (!platform) return String(id);
  if (typeof platform === 'string') return platform;
  return lang === 'id'
    ? platform.nameId || platform.nameEn || platform.name || String(id)
    : platform.nameEn || platform.nameId || platform.name || String(id);
}

export function platformIdFromName(meta: IgrsMeta, name: unknown): number | null {
  if (!name) return null;
  for (const [id, value] of Object.entries(meta.platforms || {})) {
    const label = typeof value === 'string' ? value : value.nameEn || value.nameId || value.name;
    if (label === name) return Number.parseInt(id, 10);
  }
  return null;
}

export function platformIdsFromGame(meta: IgrsMeta, game: IgrsGame): number[] {
  if (Array.isArray(game.platforms)) {
    return game.platforms.map(id => Number(id)).filter(Number.isFinite);
  }
  if (Array.isArray(game.platformsName)) {
    const ids: number[] = [];
    const seen = new Set<number>();
    for (const name of game.platformsName) {
      const id = platformIdFromName(meta, name);
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }
  return [];
}

export function ratingIdsFromGame(game: IgrsGame): number[] {
  if (!Array.isArray(game.ratings)) return [];
  return game.ratings.map(id => Number(id)).filter(Number.isFinite);
}

export function descriptorIdsFromGame(game: IgrsGame): number[] {
  if (!Array.isArray(game.descriptors)) return [];
  return game.descriptors.map(id => Number(id)).filter(Number.isFinite);
}

export function parseSteamAppId(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) return text;

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
    '0': 7,
    '3': 7,
    '3+': 7,
    '7': 4,
    '7+': 4,
    '13': 5,
    '13+': 5,
    '15': 28,
    '15+': 28,
    '18': 6,
    '18+': 6,
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

export function findGameByName(games: IgrsGame[], name: unknown, fuzzyScore: (query: string, text: string) => number): IgrsGame | null {
  if (!games.length || !name) return null;
  const normalized = normalizeSearchText(name);
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

export function stripHtml(value: unknown): string {
  if (!value) return '';
  const template = document.createElement('template');
  template.innerHTML = String(value)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*hr\b[^>]*>/gi, '\n');
  template.content.querySelectorAll('script, style, noscript, iframe, object, head').forEach(element => element.remove());
  return (template.content.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, '')
    .replace(/[\u25a0\u25a1\u25aa\u25ab\u25cf]/g, ' ')
    .replace(/-{4,}/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function formatExtraField(value: unknown, linksPatchedLabel: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text === EXTRA_FIELD_PATCHED_TOKEN || text === EXTRA_FIELD_PATCHED_LEGACY_TEXT) {
    return linksPatchedLabel;
  }
  return safeHttpUrl(text)?.href || text;
}
