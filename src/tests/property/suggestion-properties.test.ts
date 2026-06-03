// Feature: igrs-codebase-improvements, Property 14: No-Results Suggestion Optimality
// **Validates: Requirements 24.1, 24.2, 24.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createGameSearchIndex, filterIndexedGames, fuzzyScoreNormalized } from '../../core/search-index';
import { computeSuggestion } from '../../features/search/search-suggestions';
import type { IgrsGame, SearchIndexItem } from '../../shared/types';

/** Generates a random IgrsGame with constrained attribute pools for filter overlap. */
const arbGame = (id: number): fc.Arbitrary<IgrsGame> =>
  fc.record({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    publisherName: fc.string({ minLength: 1, maxLength: 15 }),
    releaseYear: fc.integer({ min: 2018, max: 2024 }),
    ratings: fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 2 }),
    descriptors: fc.array(fc.integer({ min: 1, max: 8 }), { minLength: 0, maxLength: 3 }),
    platforms: fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 2 }),
  });

/** Generates an array of random games with unique IDs. */
const arbGameArray = fc.integer({ min: 5, max: 40 }).chain(count =>
  fc.tuple(...Array.from({ length: count }, (_, i) => arbGame(i + 1)))
);

/** Counts results for a given filter state against the index. */
function countResults(
  items: SearchIndexItem[],
  state: { query: string; publisher: string; ratings: Set<number>; platforms: Set<number>; descriptors: Set<number>; years: Set<string> },
  overrides: Partial<{ ratings: Set<number>; platforms: Set<number>; descriptors: Set<number>; years: Set<string> }>
): number {
  const results = filterIndexedGames(items, {
    query: state.query || undefined,
    publisher: state.publisher || undefined,
    ratings: overrides.ratings ?? state.ratings,
    platforms: overrides.platforms ?? state.platforms,
    descriptors: overrides.descriptors ?? state.descriptors,
    years: overrides.years ?? state.years,
  }, fuzzyScoreNormalized);
  return results.length;
}

describe('Property 14: No-Results Suggestion Optimality', () => {
  it('suggested filter removal produces the highest result count among all single-filter removals', () => {
    fc.assert(
      fc.property(
        arbGameArray,
        fc.shuffledSubarray(
          ['rating-1', 'rating-2', 'rating-3', 'rating-4', 'rating-5',
           'platform-1', 'platform-2', 'platform-3', 'platform-4',
           'descriptor-1', 'descriptor-2', 'descriptor-3', 'descriptor-4',
           'descriptor-5', 'descriptor-6', 'descriptor-7', 'descriptor-8',
           'year-2018', 'year-2019', 'year-2020', 'year-2021', 'year-2022', 'year-2023', 'year-2024'],
          { minLength: 2, maxLength: 15 }
        ),
        (games, filterOrder) => {
          const index = createGameSearchIndex(games);

          // We need a filter combination that produces zero results.
          // Use all available values from the index to maximize chance of zero results.
          const allRatings = new Set<number>();
          const allPlatforms = new Set<number>();
          const allDescriptors = new Set<number>();
          const allYears = new Set<string>();

          for (const item of index.items) {
            for (const r of item.ratingIds) allRatings.add(r);
            for (const p of item.platformIds) allPlatforms.add(p);
            for (const d of item.descriptorIds) allDescriptors.add(d);
            if (item.year) allYears.add(item.year);
          }

          // Need at least 2 filter categories active to create a zero-result scenario
          // where removing one filter might help
          if (allRatings.size < 2 && allPlatforms.size < 2 && allDescriptors.size < 2 && allYears.size < 2) {
            return; // Skip: not enough diversity to create zero-result scenario
          }

          // Build a state that produces zero results by combining conflicting filters
          const state = {
            query: '',
            publisher: '',
            ratings: allRatings,
            platforms: allPlatforms,
            descriptors: allDescriptors,
            years: allYears,
          };

          // Verify this actually produces zero results
          const baseCount = countResults(index.items, state, {});
          if (baseCount > 0) {
            return; // Skip: this combination doesn't produce zero results
          }

          // Now compute the suggestion
          const suggestion = computeSuggestion(index, state, filterOrder);

          if (suggestion === null || suggestion.type === 'clear-all') {
            // If suggestion is clear-all, verify no single filter removal yields > 0 results
            for (const ratingId of state.ratings) {
              const withoutThis = new Set(state.ratings);
              withoutThis.delete(ratingId);
              const count = countResults(index.items, state, { ratings: withoutThis });
              expect(count).toBe(0);
            }
            for (const platformId of state.platforms) {
              const withoutThis = new Set(state.platforms);
              withoutThis.delete(platformId);
              const count = countResults(index.items, state, { platforms: withoutThis });
              expect(count).toBe(0);
            }
            for (const descriptorId of state.descriptors) {
              const withoutThis = new Set(state.descriptors);
              withoutThis.delete(descriptorId);
              const count = countResults(index.items, state, { descriptors: withoutThis });
              expect(count).toBe(0);
            }
            for (const year of state.years) {
              const withoutThis = new Set(state.years);
              withoutThis.delete(year);
              const count = countResults(index.items, state, { years: withoutThis });
              expect(count).toBe(0);
            }
            return;
          }

          // suggestion.type === 'remove-filter'
          expect(suggestion.type).toBe('remove-filter');
          const suggestedCount = suggestion.resultCount;

          // Verify: no other single filter removal produces a higher result count
          const allCounts: Array<{ key: string; value: string | number; count: number }> = [];

          for (const ratingId of state.ratings) {
            const withoutThis = new Set(state.ratings);
            withoutThis.delete(ratingId);
            const count = countResults(index.items, state, { ratings: withoutThis });
            allCounts.push({ key: 'rating', value: ratingId, count });
          }
          for (const platformId of state.platforms) {
            const withoutThis = new Set(state.platforms);
            withoutThis.delete(platformId);
            const count = countResults(index.items, state, { platforms: withoutThis });
            allCounts.push({ key: 'platform', value: platformId, count });
          }
          for (const descriptorId of state.descriptors) {
            const withoutThis = new Set(state.descriptors);
            withoutThis.delete(descriptorId);
            const count = countResults(index.items, state, { descriptors: withoutThis });
            allCounts.push({ key: 'descriptor', value: descriptorId, count });
          }
          for (const year of state.years) {
            const withoutThis = new Set(state.years);
            withoutThis.delete(year);
            const count = countResults(index.items, state, { years: withoutThis });
            allCounts.push({ key: 'year', value: year, count });
          }

          // The suggested filter removal must have the highest result count
          const maxCount = Math.max(...allCounts.map(c => c.count));
          expect(suggestedCount).toBe(maxCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('tie-breaking selects the most recently applied filter from filterOrder', () => {
    fc.assert(
      fc.property(
        arbGameArray,
        (games) => {
          const index = createGameSearchIndex(games);

          // Collect all filter values from the index
          const allRatings = new Set<number>();
          const allPlatforms = new Set<number>();
          const allDescriptors = new Set<number>();
          const allYears = new Set<string>();

          for (const item of index.items) {
            for (const r of item.ratingIds) allRatings.add(r);
            for (const p of item.platformIds) allPlatforms.add(p);
            for (const d of item.descriptorIds) allDescriptors.add(d);
            if (item.year) allYears.add(item.year);
          }

          // Build a state that produces zero results
          const state = {
            query: '',
            publisher: '',
            ratings: allRatings,
            platforms: allPlatforms,
            descriptors: allDescriptors,
            years: allYears,
          };

          const baseCount = countResults(index.items, state, {});
          if (baseCount > 0) return; // Skip

          // Compute all single-filter removal counts
          const candidates: Array<{ key: string; value: string | number; count: number }> = [];

          for (const ratingId of state.ratings) {
            const withoutThis = new Set(state.ratings);
            withoutThis.delete(ratingId);
            const count = countResults(index.items, state, { ratings: withoutThis });
            if (count > 0) candidates.push({ key: 'rating', value: ratingId, count });
          }
          for (const platformId of state.platforms) {
            const withoutThis = new Set(state.platforms);
            withoutThis.delete(platformId);
            const count = countResults(index.items, state, { platforms: withoutThis });
            if (count > 0) candidates.push({ key: 'platform', value: platformId, count });
          }
          for (const descriptorId of state.descriptors) {
            const withoutThis = new Set(state.descriptors);
            withoutThis.delete(descriptorId);
            const count = countResults(index.items, state, { descriptors: withoutThis });
            if (count > 0) candidates.push({ key: 'descriptor', value: descriptorId, count });
          }
          for (const year of state.years) {
            const withoutThis = new Set(state.years);
            withoutThis.delete(year);
            const count = countResults(index.items, state, { years: withoutThis });
            if (count > 0) candidates.push({ key: 'year', value: year, count });
          }

          if (candidates.length < 2) return; // Need at least 2 candidates for tie-breaking

          // Find the max count
          const maxCount = Math.max(...candidates.map(c => c.count));
          const tiedCandidates = candidates.filter(c => c.count === maxCount);

          if (tiedCandidates.length < 2) return; // No tie to break

          // Build a filterOrder where the tied candidates appear in a specific order
          // The last one in filterOrder should be the one suggested
          const filterOrder = tiedCandidates.map(c => `${c.key}-${c.value}`);

          const suggestion = computeSuggestion(index, state, filterOrder);

          expect(suggestion).not.toBeNull();
          if (suggestion?.type === 'remove-filter') {
            // The suggested filter should be the one that appears last in filterOrder
            const suggestedKey = `${suggestion.filterKey}-${suggestion.filterValue}`;
            const suggestedIndex = filterOrder.lastIndexOf(suggestedKey);

            // Verify it's the most recently applied (highest index) among tied candidates
            for (const tied of tiedCandidates) {
              const tiedKey = `${tied.key}-${tied.value}`;
              const tiedIndex = filterOrder.lastIndexOf(tiedKey);
              expect(suggestedIndex).toBeGreaterThanOrEqual(tiedIndex);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
