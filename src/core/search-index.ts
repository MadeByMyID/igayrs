import type { IgrsGame, SearchIndex, SearchIndexItem, SearchSort } from '@/shared/types';

interface SearchExtractors {
  getDescriptorIds?: (game: IgrsGame) => unknown;
  getPlatformIds?: (game: IgrsGame) => unknown;
  getRatingIds?: (game: IgrsGame) => unknown;
}

interface FilterOptions {
  descriptors?: Set<number>;
  platforms?: Set<number>;
  publisher?: string;
  query?: string;
  ratings?: Set<number>;
  years?: Set<string>;
}

export interface FilterResult {
  game: IgrsGame;
  item: SearchIndexItem;
  score: number;
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const output: number[] = [];
  const seen = new Set<number>();
  for (const item of value) {
    const numeric = Number(item);
    if (!Number.isFinite(numeric) || seen.has(numeric)) continue;
    seen.add(numeric);
    output.push(numeric);
  }
  return output;
}

function addCount(counts: Record<string, number>, key: string | number | null | undefined): void {
  if (key === '' || key === null || key === undefined) return;
  counts[String(key)] = (counts[String(key)] || 0) + 1;
}

function setHasAny(source: number[], wanted?: Set<number>): boolean {
  if (!wanted?.size) return true;
  for (const value of wanted) {
    if (source.includes(value)) return true;
  }
  return false;
}

function setHasEvery(source: number[], wanted?: Set<number>): boolean {
  if (!wanted?.size) return true;
  for (const value of wanted) {
    if (!source.includes(value)) return false;
  }
  return true;
}

export function normalizeSearchText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function fuzzyScoreNormalized(query: string, text: string): number {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(text);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const index = t.indexOf(q);
  if (index !== -1) return index === 0 || t[index - 1] === ' ' || t[index - 1] === '-' ? 80 : 70;

  const queryWords = q.split(/\s+/);
  const textWords = t.split(/\s+/);
  let wordMatches = 0;
  for (const word of queryWords) {
    if (textWords.some(textWord => textWord.startsWith(word))) wordMatches += 1;
  }
  if (wordMatches === queryWords.length) return 60;
  if (wordMatches > 0) return 40 + (wordMatches / queryWords.length) * 15;

  let queryIndex = 0;
  let consecutiveBonus = 0;
  let lastMatch = -2;
  for (let textIndex = 0; textIndex < t.length && queryIndex < q.length; textIndex += 1) {
    if (t[textIndex] === q[queryIndex]) {
      if (textIndex === lastMatch + 1) consecutiveBonus += 5;
      lastMatch = textIndex;
      queryIndex += 1;
    }
  }
  if (queryIndex === q.length) return 20 + (q.length / t.length) * 15 + consecutiveBonus;
  return 0;
}

export function createGameSearchIndex(gameList: IgrsGame[], extractors: SearchExtractors = {}): SearchIndex {
  const getRatingIds = extractors.getRatingIds || ((game: IgrsGame) => game.ratings);
  const getDescriptorIds = extractors.getDescriptorIds || ((game: IgrsGame) => game.descriptors);
  const getPlatformIds = extractors.getPlatformIds || ((game: IgrsGame) => game.platforms);

  const facets = {
    ratingCounts: {},
    platformCounts: {},
    descriptorCounts: {},
    yearCounts: {}
  };

  const items = (Array.isArray(gameList) ? gameList : []).map(game => {
    const ratingIds = toNumberArray(getRatingIds(game));
    const descriptorIds = toNumberArray(getDescriptorIds(game));
    const platformIds = toNumberArray(getPlatformIds(game));
    const year = game.releaseYear === undefined || game.releaseYear === null ? '' : String(game.releaseYear);

    for (const id of ratingIds) addCount(facets.ratingCounts, id);
    for (const id of platformIds) addCount(facets.platformCounts, id);
    for (const id of descriptorIds) addCount(facets.descriptorCounts, id);
    addCount(facets.yearCounts, year);

    return {
      game,
      nameNorm: normalizeSearchText(game.name),
      publisherNorm: normalizeSearchText(game.publisherName),
      ratingIds,
      descriptorIds,
      platformIds,
      year
    };
  });

  return { facets, items };
}

export function filterIndexedGames(
  items: SearchIndexItem[],
  filters: FilterOptions = {},
  scoreFn = fuzzyScoreNormalized
): FilterResult[] {
  const query = normalizeSearchText(filters.query);
  const publisher = normalizeSearchText(filters.publisher);
  const ratings = filters.ratings || new Set<number>();
  const platforms = filters.platforms || new Set<number>();
  const descriptors = filters.descriptors || new Set<number>();
  const years = filters.years || new Set<string>();
  const results: FilterResult[] = [];

  for (const item of Array.isArray(items) ? items : []) {
    let score = 0;

    if (query) {
      const queryScore = scoreFn(query, item.nameNorm);
      if (queryScore <= 15) continue;
      score = queryScore;
    }

    if (publisher) {
      const publisherScore = scoreFn(publisher, item.publisherNorm);
      if (publisherScore <= 15) continue;
      score = Math.max(score, publisherScore * 0.8);
    }

    if (!setHasAny(item.ratingIds, ratings)) continue;
    if (!setHasEvery(item.platformIds, platforms)) continue;
    if (!setHasEvery(item.descriptorIds, descriptors)) continue;
    if (years.size && !years.has(item.year)) continue;

    results.push({ game: item.game, item, score });
  }

  if (query || publisher) {
    results.sort((a, b) => b.score - a.score || a.item.nameNorm.localeCompare(b.item.nameNorm));
  }

  return results;
}

export function sortFilterResults(
  results: FilterResult[],
  sort: SearchSort = 'relevance',
  ratingWeight: (ratingId: number) => number = ratingId => ratingId
): FilterResult[] {
  const output = [...results];
  if (sort === 'relevance') return output;

  output.sort((left, right) => {
    if (sort === 'title-asc' || sort === 'title-desc') {
      const comparison = left.item.nameNorm.localeCompare(right.item.nameNorm);
      return sort === 'title-asc' ? comparison : -comparison;
    }

    if (sort === 'year-asc' || sort === 'year-desc') {
      const leftYear = Number(left.item.year) || 0;
      const rightYear = Number(right.item.year) || 0;
      const comparison = leftYear - rightYear;
      return sort === 'year-asc' ? comparison : -comparison;
    }

    const leftWeight = ratingWeight(left.item.ratingIds[0] || 0);
    const rightWeight = ratingWeight(right.item.ratingIds[0] || 0);
    const comparison = leftWeight - rightWeight;
    return sort === 'rating-asc' ? comparison : -comparison;
  });

  return output;
}
