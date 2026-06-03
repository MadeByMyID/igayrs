import { describe, expect, it } from 'vitest';
import { createGameSearchIndex } from '@/core/search-index';
import { buildSearchResultsModel } from '@/features/search/search-results-model';
import { SEARCH_RESULTS_PER_PAGE, VIRTUAL_SCROLL_THRESHOLD } from '@/features/search/search-constants';
import type { IgrsGame, IgrsMeta } from '@/shared/types';

const meta: IgrsMeta = {
  descriptors: {},
  platforms: { 1: 'PC' },
  ratings: { 7: { name: 'SU', titleEn: 'Everyone', weight: 1 } },
};

function makeGames(count: number): IgrsGame[] {
  return Array.from({ length: count }, (_, index) => ({
    descriptors: [],
    id: index + 1,
    name: `Game ${String(index + 1).padStart(3, '0')}`,
    platforms: [1],
    publisherName: 'Test Publisher',
    ratings: [7],
    releaseYear: 2026,
  }));
}

describe('buildSearchResultsModel', () => {
  it('does not truncate no-query result sets before virtual scrolling can be selected', () => {
    const games = makeGames(VIRTUAL_SCROLL_THRESHOLD + 1);
    const searchIndex = createGameSearchIndex(games);

    const model = buildSearchResultsModel({
      descriptors: new Set(),
      meta,
      page: 1,
      platforms: new Set(),
      publisher: '',
      query: '',
      ratings: new Set(),
      searchIndex,
      sort: 'relevance',
      years: new Set(),
    });

    expect(model.filtered).toHaveLength(VIRTUAL_SCROLL_THRESHOLD + 1);
    expect(model.useVirtualScroll).toBe(true);
    expect(model.visibleResults).toHaveLength(SEARCH_RESULTS_PER_PAGE);
  });
});
