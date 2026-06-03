// Feature: igrs-codebase-improvements, Property 11: Related Games Share Required Attributes
// Feature: igrs-codebase-improvements, Property 12: Related Games Ranked by Descriptor Overlap
// **Validates: Requirements 31.1, 31.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { findRelatedGames } from '../../shared/lib/related-games';
import type { IgrsGame } from '../../shared/types';

// --- Generators ---

/** Generate a non-empty array of unique positive integers (for rating/descriptor IDs) */
function nonEmptyUniqueIds(minLength = 1, maxLength = 5): fc.Arbitrary<number[]> {
  return fc.uniqueArray(fc.integer({ min: 1, max: 20 }), { minLength, maxLength });
}

/** Generate a valid IgrsGame with non-empty ratings and descriptors */
function gameArb(idRange: { min: number; max: number } = { min: 1, max: 1000 }): fc.Arbitrary<IgrsGame> {
  return fc.record({
    id: fc.integer(idRange),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    publisherName: fc.string({ minLength: 1, maxLength: 30 }),
    releaseYear: fc.integer({ min: 2000, max: 2025 }),
    ratings: nonEmptyUniqueIds(1, 4),
    descriptors: nonEmptyUniqueIds(1, 6),
  });
}

/**
 * Compute the descriptor overlap count between a candidate game and the current game.
 */
function descriptorOverlap(game: IgrsGame, currentGame: IgrsGame): number {
  const currentSet = new Set(currentGame.descriptors!);
  let count = 0;
  for (const d of game.descriptors!) {
    if (currentSet.has(d)) count++;
  }
  return count;
}

// --- Property Tests ---

describe('Property 11: Related Games Share Required Attributes', () => {
  it('every related game shares at least one rating ID AND at least one descriptor ID with the current game, and the current game does not appear in its own related games list', () => {
    fc.assert(
      fc.property(
        gameArb({ min: 1, max: 100 }),
        fc.array(gameArb({ min: 101, max: 5000 }), { minLength: 1, maxLength: 30 }),
        (currentGame, otherGames) => {
          // Ensure unique IDs across all games
          const allGames = [currentGame, ...otherGames];
          const seenIds = new Set<number>();
          for (const g of allGames) {
            if (seenIds.has(g.id)) {
              g.id = Math.max(...seenIds) + 1;
            }
            seenIds.add(g.id);
          }

          const result = findRelatedGames(currentGame, allGames);

          // Current game SHALL NOT appear in its own related games list
          for (const relatedGame of result) {
            expect(relatedGame.id).not.toBe(currentGame.id);
          }

          // Every related game shares at least one rating ID with the current game
          const currentRatingSet = new Set(currentGame.ratings!);
          const currentDescriptorSet = new Set(currentGame.descriptors!);

          for (const relatedGame of result) {
            const sharesRating = relatedGame.ratings!.some(r => currentRatingSet.has(r));
            expect(sharesRating).toBe(true);

            const sharesDescriptor = relatedGame.descriptors!.some(d => currentDescriptorSet.has(d));
            expect(sharesDescriptor).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 12: Related Games Ranked by Descriptor Overlap', () => {
  it('the 6 displayed games have descriptor overlap counts >= any excluded candidate', () => {
    fc.assert(
      fc.property(
        // Generate a current game with enough descriptors to create meaningful overlap variation
        gameArb({ min: 1, max: 50 }).filter(g => g.descriptors!.length >= 2),
        // Number of candidate related games (must be > 6 for this property to apply)
        fc.integer({ min: 8, max: 15 }),
        // Stream of raw data to build candidates from
        fc.infiniteStream(fc.record({
          id: fc.integer({ min: 100, max: 9999 }),
          name: fc.string({ minLength: 1, maxLength: 20 }),
          publisherName: fc.string({ minLength: 1, maxLength: 20 }),
          releaseYear: fc.integer({ min: 2000, max: 2025 }),
          extraRatings: fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 0, maxLength: 3 }),
          extraDescriptors: fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 0, maxLength: 5 }),
          sharedDescriptorCount: fc.integer({ min: 1, max: 6 }),
        })),
        (currentGame, candidateCount, candidateStream) => {
          const currentRatings = currentGame.ratings!;
          const currentDescriptors = currentGame.descriptors!;

          // Build candidate games that all share at least one rating and at least one descriptor
          const candidates: IgrsGame[] = [];
          const usedIds = new Set([currentGame.id]);
          const iter = candidateStream[Symbol.iterator]();

          for (let i = 0; i < candidateCount; i++) {
            const raw = iter.next().value!;

            // Ensure unique ID
            let id = raw.id;
            while (usedIds.has(id)) id++;
            usedIds.add(id);

            // Share at least one rating from current game
            const sharedRating = currentRatings[i % currentRatings.length];
            const ratings = [...new Set([sharedRating, ...raw.extraRatings])];

            // Share a controlled number of descriptors from current game to create overlap variation
            const numToShare = Math.min(raw.sharedDescriptorCount, currentDescriptors.length);
            const sharedDescriptors = currentDescriptors.slice(0, numToShare);
            const descriptors = [...new Set([...sharedDescriptors, ...raw.extraDescriptors])];

            candidates.push({
              id,
              name: raw.name || `Game${id}`,
              publisherName: raw.publisherName || 'Publisher',
              releaseYear: raw.releaseYear,
              ratings,
              descriptors,
            });
          }

          const allGames = [currentGame, ...candidates];
          const result = findRelatedGames(currentGame, allGames, 6);

          // All candidates are valid related games by construction (share ≥1 rating AND ≥1 descriptor)
          // Since candidateCount > 6, result should have exactly 6 games
          expect(result.length).toBe(6);

          // Compute overlap for included games
          const includedOverlaps = result.map(g => descriptorOverlap(g, currentGame));
          const minIncludedOverlap = Math.min(...includedOverlaps);

          // Compute overlap for excluded candidates
          const resultIds = new Set(result.map(g => g.id));
          const excludedCandidates = candidates.filter(c => !resultIds.has(c.id));

          // Every excluded candidate's overlap should be <= the minimum included overlap
          for (const excluded of excludedCandidates) {
            const excludedOverlap = descriptorOverlap(excluded, currentGame);
            expect(excludedOverlap).toBeLessThanOrEqual(minIncludedOverlap);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
