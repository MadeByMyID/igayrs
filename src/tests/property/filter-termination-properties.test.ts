// Feature: igrs-codebase-improvements, Property 8: Early Filter Termination Correctness
// **Validates: Requirements 17.1, 17.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createGameSearchIndex, filterIndexedGames } from '../../core/search-index';
import type { IgrsGame } from '../../shared/types';

const PAGE_SIZE = 30;

/** Generates a random IgrsGame with varied ratings, platforms, descriptors, and years. */
const arbGame = (id: number): fc.Arbitrary<IgrsGame> =>
  fc.record({
    id: fc.constant(id),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    publisherName: fc.string({ minLength: 1, maxLength: 20 }),
    releaseYear: fc.integer({ min: 2000, max: 2025 }),
    ratings: fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 0, maxLength: 3 }),
    descriptors: fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 0, maxLength: 5 }),
    platforms: fc.array(fc.integer({ min: 1, max: 8 }), { minLength: 0, maxLength: 4 }),
  });

/** Generates an array of random games with unique IDs. */
const arbGameArray = fc.integer({ min: 10, max: 150 }).chain(count =>
  fc.tuple(...Array.from({ length: count }, (_, i) => arbGame(i + 1)))
);

/** Generates a random subset from a pool of possible values as a Set. */
const arbSubset = (maxValue: number): fc.Arbitrary<Set<number>> =>
  fc.array(fc.integer({ min: 1, max: maxValue }), { minLength: 0, maxLength: 3 })
    .map(arr => new Set(arr));

/** Generates random filter options WITHOUT a text query (early termination is disabled with text queries). */
const arbFilterOptions = fc.record({
  ratings: arbSubset(10),
  platforms: arbSubset(8),
  descriptors: arbSubset(20),
  years: fc.array(fc.integer({ min: 2000, max: 2025 }), { minLength: 0, maxLength: 3 })
    .map(arr => new Set(arr.map(String))),
});

describe('Property 8: Early Filter Termination Correctness', () => {
  it('results for the current page with early termination are identical to exhaustive filter results', () => {
    fc.assert(
      fc.property(
        arbGameArray,
        arbFilterOptions,
        fc.integer({ min: 1, max: 5 }),
        (games, filters, page) => {
          // Build a search index from the generated games
          const index = createGameSearchIndex(games);

          // Run exhaustive filter (no limit)
          const exhaustiveResults = filterIndexedGames(index.items, {
            ratings: filters.ratings,
            platforms: filters.platforms,
            descriptors: filters.descriptors,
            years: filters.years,
          });

          // Calculate the limit for early termination: (page + 1) * PAGE_SIZE
          // This ensures we have enough results to display the requested page
          const limit = (page + 1) * PAGE_SIZE;

          // Run filter with early termination limit
          const limitedResults = filterIndexedGames(index.items, {
            ratings: filters.ratings,
            platforms: filters.platforms,
            descriptors: filters.descriptors,
            years: filters.years,
            limit,
          });

          // Extract the current page slice from both result sets
          const pageStart = (page - 1) * PAGE_SIZE;
          const pageEnd = page * PAGE_SIZE;

          const exhaustivePage = exhaustiveResults
            .slice(pageStart, pageEnd)
            .map(r => r.game.id);

          const limitedPage = limitedResults
            .slice(pageStart, pageEnd)
            .map(r => r.game.id);

          // The results for the current page should be identical
          expect(limitedPage).toEqual(exhaustivePage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
