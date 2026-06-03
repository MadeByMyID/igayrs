import { countIndexedGames, fuzzyScorePreNormalized } from '@/core/search-index';
import { normalizeSearchText } from '@/core/search-text';
import type { SearchIndex, SearchIndexItem } from '@/shared/types';

export interface FilterSuggestion {
  type: 'remove-filter';
  filterKey: string;
  filterValue: string | number;
  resultCount: number;
}

export interface ClearAllSuggestion {
  type: 'clear-all';
  totalGames: number;
}

export interface ClearQuerySuggestion {
  type: 'clear-query';
  totalGames: number;
}

export type Suggestion = FilterSuggestion | ClearAllSuggestion | ClearQuerySuggestion;

interface SearchState {
  query: string;
  publisher: string;
  ratings: Set<number>;
  platforms: Set<number>;
  descriptors: Set<number>;
  years: Set<string>;
}

interface CandidateRemoval {
  filterKey: string;
  filterValue: string | number;
  orderIndex: number;
  overrides: Partial<Pick<SearchState, 'ratings' | 'platforms' | 'descriptors' | 'years'>>;
}

/**
 * Computes the best suggestion for a zero-results search state.
 *
 * Strategy:
 * 1. If filters are active, evaluate removing each one individually.
 *    Suggest the filter whose removal yields the highest result count.
 *    Tie-break by most recently applied (last in filterOrder).
 * 2. If no single filter removal helps, suggest clearing all filters.
 * 3. If no filters are active, suggest clearing the query.
 */
export function computeSuggestion(
  index: SearchIndex,
  state: SearchState,
  filterOrder: string[]
): Suggestion | null {
  const hasFilters = !!(
    state.ratings.size ||
    state.platforms.size ||
    state.descriptors.size ||
    state.years.size
  );

  // If no filters active, suggest clearing the query
  if (!hasFilters) {
    if (state.query || state.publisher) {
      return { type: 'clear-query', totalGames: index.items.length };
    }
    return null;
  }

  // Pre-normalize query and publisher once for all countResults calls
  const normalizedQuery = normalizeSearchText(state.query) || undefined;
  const normalizedPublisher = normalizeSearchText(state.publisher) || undefined;

  const removals: CandidateRemoval[] = [];

  for (const ratingId of state.ratings) {
    const withoutThis = new Set(state.ratings);
    withoutThis.delete(ratingId);
    const filterKey = 'rating';
    removals.push({
      filterKey,
      filterValue: ratingId,
      orderIndex: filterOrder.lastIndexOf(`${filterKey}-${ratingId}`),
      overrides: { ratings: withoutThis },
    });
  }

  for (const platformId of state.platforms) {
    const withoutThis = new Set(state.platforms);
    withoutThis.delete(platformId);
    const filterKey = 'platform';
    removals.push({
      filterKey,
      filterValue: platformId,
      orderIndex: filterOrder.lastIndexOf(`${filterKey}-${platformId}`),
      overrides: { platforms: withoutThis },
    });
  }

  for (const descriptorId of state.descriptors) {
    const withoutThis = new Set(state.descriptors);
    withoutThis.delete(descriptorId);
    const filterKey = 'descriptor';
    removals.push({
      filterKey,
      filterValue: descriptorId,
      orderIndex: filterOrder.lastIndexOf(`${filterKey}-${descriptorId}`),
      overrides: { descriptors: withoutThis },
    });
  }

  for (const year of state.years) {
    const withoutThis = new Set(state.years);
    withoutThis.delete(year);
    const filterKey = 'year';
    removals.push({
      filterKey,
      filterValue: year,
      orderIndex: filterOrder.lastIndexOf(`${filterKey}-${year}`),
      overrides: { years: withoutThis },
    });
  }

  const candidates: Array<{ filterKey: string; filterValue: string | number; orderIndex: number; resultCount: number }> = [];
  const removalsByRecency = [...removals].sort((a, b) => b.orderIndex - a.orderIndex);

  for (const removal of removalsByRecency) {
    const count = countResults(index.items, normalizedQuery, normalizedPublisher, state, removal.overrides);
    if (count > 0) {
      const candidate = {
        filterKey: removal.filterKey,
        filterValue: removal.filterValue,
        orderIndex: removal.orderIndex,
        resultCount: count,
      };

      if (removal.orderIndex >= 0 && count === index.items.length) {
        return {
          type: 'remove-filter',
          filterKey: candidate.filterKey,
          filterValue: candidate.filterValue,
          resultCount: candidate.resultCount,
        };
      }

      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    // No single filter removal helps — suggest clearing all
    return { type: 'clear-all', totalGames: index.items.length };
  }

  // Sort by highest result count, tie-break by most recently applied
  candidates.sort((a, b) => {
    if (b.resultCount !== a.resultCount) return b.resultCount - a.resultCount;
    return b.orderIndex - a.orderIndex;
  });

  const best = candidates[0]!;
  return {
    type: 'remove-filter',
    filterKey: best.filterKey,
    filterValue: best.filterValue,
    resultCount: best.resultCount,
  };
}

/**
 * Counts results with a modified filter set without materializing sorted result arrays.
 * Accepts pre-normalized query/publisher to avoid redundant normalization across
 * multiple countResults calls within a single computeSuggestion invocation.
 */
function countResults(
  items: SearchIndexItem[],
  normalizedQuery: string | undefined,
  normalizedPublisher: string | undefined,
  state: SearchState,
  overrides: Partial<Pick<SearchState, 'ratings' | 'platforms' | 'descriptors' | 'years'>>
): number {
  return countIndexedGames(items, {
    query: normalizedQuery,
    publisher: normalizedPublisher,
    ratings: overrides.ratings ?? state.ratings,
    platforms: overrides.platforms ?? state.platforms,
    descriptors: overrides.descriptors ?? state.descriptors,
    years: overrides.years ?? state.years,
  }, fuzzyScorePreNormalized);
}
