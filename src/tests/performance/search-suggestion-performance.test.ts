// @vitest-environment node
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { createGameSearchIndex } from '@/core/search-index';
import { computeSuggestion } from '@/features/search/search-suggestions';
import type { IgrsGame } from '@/shared/types';

const GAME_COUNT = 50_000;
const SUGGESTION_BUDGET_MS = 25;

function makeGames(count: number): IgrsGame[] {
  return Array.from({ length: count }, (_, index) => ({
    descriptors: [1],
    id: index + 1,
    name: `Game ${index + 1}`,
    platforms: [1],
    publisherName: 'Performance Studio',
    ratings: [1],
    releaseYear: 2026,
  }));
}

describe('search suggestion performance', () => {
  it('counts zero-result filter suggestions without materializing large result sets', () => {
    const index = createGameSearchIndex(makeGames(GAME_COUNT));
    const startedAt = performance.now();

    const suggestion = computeSuggestion(
      index,
      {
        descriptors: new Set([1]),
        platforms: new Set([1]),
        publisher: '',
        query: 'game',
        ratings: new Set([1]),
        years: new Set(['1900']),
      },
      ['rating-1', 'platform-1', 'descriptor-1', 'year-1900']
    );

    const durationMs = performance.now() - startedAt;

    expect(suggestion).toEqual({
      filterKey: 'year',
      filterValue: '1900',
      resultCount: GAME_COUNT,
      type: 'remove-filter',
    });
    expect(durationMs).toBeLessThan(SUGGESTION_BUDGET_MS);
  });
});
