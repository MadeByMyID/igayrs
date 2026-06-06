import type { IgrsGame, SearchIndex, SearchIndexItem, SearchSort } from '@/shared/types';
import { normalizeSearchText } from '@/core/search-text';

// Re-export for backward compatibility
export { normalizeSearchText } from '@/core/search-text';

interface SearchExtractors {
  getDescriptorIds?: (game: IgrsGame) => unknown;
  getPlatformIds?: (game: IgrsGame) => unknown;
  getRatingIds?: (game: IgrsGame) => unknown;
}

interface FilterOptions {
  descriptors?: Set<number>;
  limit?: number;
  platforms?: Set<number>;
  publisher?: string;
  query?: string;
  ratings?: Set<number>;
  years?: Set<string>;
}

type SearchScoreFn = (query: string, text: string) => number;

export interface FilterResult {
  game: IgrsGame;
  item: SearchIndexItem;
  score: number;
}

interface FilterContext {
  descriptors: Set<number>;
  platforms: Set<number>;
  publisher: string;
  publisherWords: string[];
  query: string;
  queryWords: string[];
  ratings: Set<number>;
  years: Set<string>;
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

function setHasAny(source: Set<number>, wanted?: Set<number>): boolean {
  if (!wanted?.size) return true;
  for (const value of wanted) {
    if (source.has(value)) return true;
  }
  return false;
}

function setHasEvery(source: Set<number>, wanted?: Set<number>): boolean {
  if (!wanted?.size) return true;
  for (const value of wanted) {
    if (!source.has(value)) return false;
  }
  return true;
}

function createFilterContext(filters: FilterOptions, scoreFn: SearchScoreFn): FilterContext {
  // When scoreFn is fuzzyScorePreNormalized, the caller guarantees pre-normalized inputs.
  // Otherwise, normalize here. Either way, matchIndexedItem always uses the
  // pre-normalized fast path since inputs are guaranteed normalized at this point.
  const skipNormalization = scoreFn === fuzzyScorePreNormalized;
  const query = skipNormalization ? (filters.query || '') : normalizeSearchText(filters.query);
  const publisher = skipNormalization ? (filters.publisher || '') : normalizeSearchText(filters.publisher);
  return {
    descriptors: filters.descriptors || new Set<number>(),
    platforms: filters.platforms || new Set<number>(),
    publisher,
    publisherWords: publisher ? publisher.split(' ') : [],
    query,
    queryWords: query ? query.split(' ') : [],
    ratings: filters.ratings || new Set<number>(),
    years: filters.years || new Set<string>(),
  };
}

/**
 * Core fuzzy scoring — single implementation used by all scoring paths.
 * Accepts pre-split query words to avoid redundant splitting in hot loops.
 */
function scoreFuzzy(q: string, qWords: string[], t: string): number {
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const index = t.indexOf(q);
  if (index !== -1) return index === 0 || t[index - 1] === ' ' || t[index - 1] === '-' ? 80 : 70;

  // Word-prefix matching — check if query words match the start of any word in target.
  // Avoids allocating a split array for `t` by scanning for word boundaries.
  let wordMatches = 0;
  for (const word of qWords) {
    let found = false;
    let searchFrom = 0;
    while (searchFrom <= t.length - word.length) {
      const wordIdx = t.indexOf(word, searchFrom);
      if (wordIdx === -1) break;
      if (wordIdx === 0 || t[wordIdx - 1] === ' ') {
        found = true;
        break;
      }
      // Skip past this occurrence to find next potential word boundary
      searchFrom = wordIdx + 1;
    }
    if (found) wordMatches += 1;
  }
  if (wordMatches === qWords.length) return 60;
  if (wordMatches > 0) return 40 + (wordMatches / qWords.length) * 15;

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

/**
 * Optimized scoring that uses pre-split query words from the filter context
 * to avoid repeated string splitting in the hot loop.
 * Delegates to {@link scoreFuzzy} for the actual scoring algorithm.
 */
function scorePreNormalizedWithContext(q: string, qWords: string[], t: string): number {
  return scoreFuzzy(q, qWords, t);
}

function matchIndexedItem(item: SearchIndexItem, context: FilterContext): number | null {
  let score = 0;

  if (!setHasAny(item.ratingIdSet, context.ratings)) return null;
  if (!setHasEvery(item.platformIdSet, context.platforms)) return null;
  if (!setHasEvery(item.descriptorIdSet, context.descriptors)) return null;
  if (context.years.size && !context.years.has(item.year)) return null;

  if (context.query) {
    const queryScore = scorePreNormalizedWithContext(context.query, context.queryWords, item.nameNorm);
    if (queryScore <= 15) return null;
    score = queryScore;
  }

  if (context.publisher) {
    const publisherScore = scorePreNormalizedWithContext(context.publisher, context.publisherWords, item.publisherNorm);
    if (publisherScore <= 15) return null;
    score = Math.max(score, publisherScore * 0.8);
  }

  return score;
}

/**
 * Computes a fuzzy match score between a search query and a target text.
 * Both inputs are normalized (lowercased, stripped of non-alphanumeric characters)
 * before comparison.
 *
 * Scoring range (0–100):
 * - 100: exact match after normalization
 * - 90: target starts with the query
 * - 80: query found at a word/separator boundary within the target
 * - 70: query found as a substring (non-boundary position)
 * - 60: all query words match the start of target words
 * - 40–55: partial word-prefix matches (proportional to matched words)
 * - 20–35: subsequence match with consecutive-character bonus
 * - 0: no meaningful match found
 *
 * @param query - The search string entered by the user
 * @param text - The target text to match against (e.g., a game title)
 * @returns A score between 0 and 100 inclusive, where higher means better match
 *
 * @example
 * ```ts
 * fuzzyScoreNormalized('mario', 'Super Mario Bros'); // 80 (word boundary match)
 * fuzzyScoreNormalized('super mario', 'Super Mario Bros'); // 90 (starts with)
 * fuzzyScoreNormalized('xyz', 'Super Mario Bros'); // 0 (no match)
 * ```
 */
export function fuzzyScoreNormalized(query: string, text: string): number {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(text);
  return fuzzyScorePreNormalized(q, t);
}

/**
 * Scoring function for pre-normalized strings. Avoids redundant normalization
 * when called in hot loops where inputs are already normalized.
 *
 * Delegates to {@link scoreFuzzy} for the actual scoring algorithm.
 * Uses the same scoring tiers as {@link fuzzyScoreNormalized} (0–100) but
 * expects both inputs to already be lowercased and stripped of special characters.
 *
 * Caches the last query split to avoid repeated allocations in tight loops
 * where the same query is scored against many targets.
 *
 * @param q - Pre-normalized query string
 * @param t - Pre-normalized target string
 * @returns A score between 0 and 100 inclusive
 */
let _lastQ = '';
let _lastQWords: string[] = [];

export function fuzzyScorePreNormalized(q: string, t: string): number {
  if (q !== _lastQ) {
    _lastQ = q;
    _lastQWords = q ? q.split(' ') : [];
  }
  return scoreFuzzy(q, _lastQWords, t);
}

/**
 * Creates a search index from a list of games, pre-computing normalized text
 * and facet counts for efficient filtering and searching.
 *
 * Each game is processed to extract normalized name/publisher text, rating/descriptor/platform
 * ID sets, and release year. Facet counts (how many games share each attribute value) are
 * accumulated for use in filter UI display.
 *
 * @param gameList - Array of IGRS game objects to index
 * @param extractors - Optional custom accessor functions for extracting IDs from game objects.
 *   Defaults to reading `game.ratings`, `game.descriptors`, and `game.platforms` directly.
 * @returns A {@link SearchIndex} containing the indexed items array and aggregated facet counts
 *
 * @example
 * ```ts
 * import { createGameSearchIndex } from '@/core/search-index';
 *
 * const games = await loadIgrsData();
 * const index = createGameSearchIndex(games);
 *
 * // Use index.items with filterIndexedGames for searching
 * // Use index.facets for rendering filter panel counts
 * const ratingCounts = index.facets.ratingCounts;
 * ```
 */
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
      ratingIdSet: new Set(ratingIds),
      descriptorIdSet: new Set(descriptorIds),
      platformIdSet: new Set(platformIds),
      year
    };
  });

  return { facets, items };
}

/**
 * Filters indexed games by text query, publisher, and facet selections.
 *
 * When a text query or publisher filter is active, results are scored using the provided
 * scoring function (defaults to {@link fuzzyScoreNormalized}) and sorted by descending score.
 * Items scoring 15 or below are excluded. When only facet filters are active (no text),
 * early termination is applied once the result limit is reached.
 *
 * @param items - The indexed items array from {@link createGameSearchIndex}
 * @param filters - Filter criteria to apply:
 *   - `query`: fuzzy text search against game name
 *   - `publisher`: fuzzy text search against publisher name
 *   - `ratings`: set of rating IDs (match any)
 *   - `platforms`: set of platform IDs (match all)
 *   - `descriptors`: set of descriptor IDs (match all)
 *   - `years`: set of release year strings (match any)
 *   - `limit`: maximum results to return (only applied when no text filter is active)
 * @param scoreFn - Custom scoring function, defaults to {@link fuzzyScoreNormalized}
 * @returns Array of {@link FilterResult} objects containing the matched game, its index item, and score
 *
 * @example
 * ```ts
 * import { createGameSearchIndex, filterIndexedGames } from '@/core/search-index';
 *
 * const index = createGameSearchIndex(games);
 * const results = filterIndexedGames(index.items, {
 *   query: 'mario',
 *   ratings: new Set([4, 5]),
 *   limit: 30,
 * });
 *
 * const resultSummaries = results.map(({ game, score }) => `${game.name} (score: ${score})`);
 * ```
 */
export function filterIndexedGames(
  items: SearchIndexItem[],
  filters: FilterOptions = {},
  scoreFn: SearchScoreFn = fuzzyScoreNormalized
): FilterResult[] {
  const context = createFilterContext(filters, scoreFn);
  const results: FilterResult[] = [];

  // Early termination is only safe when no score-based sorting will occur.
  // When query or publisher is present, results are sorted by score at the end,
  // so we must scan all items to find the highest-scoring matches.
  const hasTextFilter = !!(context.query || context.publisher);
  const limit = (!hasTextFilter && filters.limit && filters.limit > 0) ? filters.limit : undefined;

  for (const item of Array.isArray(items) ? items : []) {
    const score = matchIndexedItem(item, context);
    if (score === null) continue;

    results.push({ game: item.game, item, score });

    // Stop early once we have enough results for the requested page + buffer.
    // Safe only when no text filter is active (no post-loop score sorting needed).
    if (limit && results.length >= limit) break;
  }

  if (context.query || context.publisher) {
    results.sort((a, b) => b.score - a.score || a.item.nameNorm.localeCompare(b.item.nameNorm));
  }

  return results;
}

/**
 * Counts indexed games matching the same criteria as {@link filterIndexedGames}
 * without materializing result objects or sorting by score.
 */
export function countIndexedGames(
  items: SearchIndexItem[],
  filters: FilterOptions = {},
  scoreFn: SearchScoreFn = fuzzyScoreNormalized
): number {
  const context = createFilterContext(filters, scoreFn);
  let count = 0;

  for (const item of Array.isArray(items) ? items : []) {
    if (matchIndexedItem(item, context) !== null) count += 1;
  }

  return count;
}

/**
 * Sorts filter results by the specified sort criterion.
 *
 * When sort is `'relevance'` (default), results are returned as-is since
 * {@link filterIndexedGames} already sorts by score when a text filter is active.
 *
 * @param results - Array of filter results from {@link filterIndexedGames}
 * @param sort - Sort criterion: `'relevance'`, `'title-asc'`, `'title-desc'`,
 *   `'year-asc'`, `'year-desc'`, `'rating-asc'`, or `'rating-desc'`
 * @param ratingWeight - Optional function mapping a rating ID to a numeric weight for
 *   rating-based sorting. Defaults to using the rating ID itself as the weight.
 * @returns The same array reference, sorted in place according to the criterion
 */
export function sortFilterResults(
  results: FilterResult[],
  sort: SearchSort = 'relevance',
  ratingWeight: (ratingId: number) => number = ratingId => ratingId
): FilterResult[] {
  // No copy needed — input is always a fresh array from filterIndexedGames
  if (sort === 'relevance') return results;

  results.sort((left, right) => {
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

  return results;
}
