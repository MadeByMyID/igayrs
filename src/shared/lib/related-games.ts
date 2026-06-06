/**
 * Related games discovery based on shared rating and descriptor IDs.
 *
 * Algorithm:
 * 1. Filter games sharing ≥1 rating ID AND ≥1 descriptor ID with the current game
 * 2. Score each candidate by the number of shared descriptor IDs
 * 3. Sort descending by score
 * 4. Return top N results (default 6)
 */
import type { IgrsGame } from '@/shared/types';

const DEFAULT_MAX_RESULTS = 6;

/**
 * Finds games related to the current game based on shared ratings and descriptors.
 *
 * @param currentGame - The game to find related games for
 * @param allGames - The full list of games to search through
 * @param maxResults - Maximum number of related games to return (default 6)
 * @returns Array of related games sorted by descriptor overlap (descending)
 *
 * @example
 * ```ts
 * const related = findRelatedGames(currentGame, allGames);
 * // Returns up to 6 games sharing ≥1 rating AND ≥1 descriptor with currentGame
 * ```
 */
export function findRelatedGames(
  currentGame: IgrsGame,
  allGames: IgrsGame[],
  maxResults: number = DEFAULT_MAX_RESULTS,
): IgrsGame[] {
  const currentRatings = currentGame.ratings;
  const currentDescriptors = currentGame.descriptors;

  // Early exit if current game has empty or undefined ratings/descriptors
  if (!currentRatings || currentRatings.length === 0) return [];
  if (!currentDescriptors || currentDescriptors.length === 0) return [];

  // Build Sets for O(1) lookups
  const ratingSet = new Set(currentRatings);
  const descriptorSet = new Set(currentDescriptors);

  // Score candidates: games sharing ≥1 rating AND ≥1 descriptor
  const scored: Array<{ game: IgrsGame; score: number }> = [];
  // Track the minimum score in our top-N to enable early pruning
  let minKeptScore = 0;

  for (const game of allGames) {
    // Exclude the current game itself
    if (game.id === currentGame.id) continue;

    const gameRatings = game.ratings;
    const gameDescriptors = game.descriptors;

    // Skip games with empty ratings or descriptors
    if (!gameRatings || gameRatings.length === 0) continue;
    if (!gameDescriptors || gameDescriptors.length === 0) continue;

    // Check for at least one shared rating
    let hasSharedRating = false;
    for (const rId of gameRatings) {
      if (ratingSet.has(rId)) {
        hasSharedRating = true;
        break;
      }
    }
    if (!hasSharedRating) continue;

    // Count shared descriptors (also confirms ≥1 shared descriptor)
    let sharedDescriptorCount = 0;
    for (const dId of gameDescriptors) {
      if (descriptorSet.has(dId)) {
        sharedDescriptorCount++;
      }
    }
    if (sharedDescriptorCount === 0) continue;

    // Skip candidates that can't make it into the top-N
    if (scored.length >= maxResults && sharedDescriptorCount < minKeptScore) continue;

    scored.push({ game, score: sharedDescriptorCount });

    // Maintain a bounded result set: sort and trim periodically
    // to keep minKeptScore accurate without sorting on every insert.
    if (scored.length >= maxResults * 3) {
      scored.sort((a, b) => b.score - a.score);
      scored.length = maxResults;
      minKeptScore = scored[scored.length - 1]!.score;
    }
  }

  // Sort by descriptor overlap descending
  scored.sort((a, b) => b.score - a.score);

  // Return top N
  return scored.slice(0, maxResults).map(entry => entry.game);
}
