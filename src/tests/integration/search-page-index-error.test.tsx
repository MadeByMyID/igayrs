import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from '@/features/search/search-page';

const mocks = vi.hoisted(() => {
  const games = [
    {
      id: 1,
      name: 'Alpha Game',
      publisherName: 'North Studio',
      releaseYear: 2026,
      ratings: [7],
      descriptors: [3],
      platforms: [1],
    },
  ];
  const meta = {
    descriptors: {
      3: { nameEn: 'Violence', nameId: 'Kekerasan' },
    },
    platforms: {
      1: 'PC',
    },
    ratings: {
      7: { name: 'SU', titleEn: 'Everyone', weight: 1 },
    },
  };

  return {
    data: {
      games,
      gamesById: new Map(games.map(game => [game.id, game])),
      gamesByNormalizedName: new Map([['alpha game', games[0]]]),
      meta,
      stats: { platformCount: 1, publisherCount: 1 },
      steamMeta: { contentDescriptors: {} },
    },
    index: {
      facets: {
        descriptorCounts: { 3: 1 },
        platformCounts: { 1: 1 },
        ratingCounts: { 7: 1 },
        yearCounts: { 2026: 1 },
      },
      items: [
        {
          game: games[0],
          descriptorIds: [3],
          descriptorIdSet: new Set([3]),
          nameNorm: 'alpha game',
          platformIds: [1],
          platformIdSet: new Set([1]),
          publisherNorm: 'north studio',
          ratingIds: [7],
          ratingIdSet: new Set([7]),
          year: '2026',
        },
      ],
    },
    indexError: null as Error | null,
    retryIndex: vi.fn(),
  };
});

vi.mock('@/app/providers/language-provider', () => ({
  useLanguage: () => ({
    dictionaryLoading: false,
    lang: 'en',
    t: (key: string) => key,
    toggleLanguage: vi.fn(),
    unlocked: false,
  }),
}));

vi.mock('@/app/providers/data-provider', () => ({
  useRequiredIgrsData: () => ({
    data: mocks.data,
    error: null,
    loading: false,
  }),
}));

vi.mock('@/shared/hooks/use-search-index', () => ({
  useSearchIndex: () => ({
    error: mocks.indexError,
    index: mocks.indexError ? null : mocks.index,
    loading: false,
    retry: mocks.retryIndex,
  }),
}));

vi.mock('@/shared/api/steam-api', () => ({
  createSteamApi: () => ({
    findSteamMatchForGame: vi.fn(),
  }),
}));

describe('SearchPage index error handling', () => {
  beforeEach(() => {
    mocks.indexError = null;
    mocks.retryIndex.mockReset();
    window.scrollTo = vi.fn();
  });

  it('can transition from results to index error without breaking hook order', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/search/']}>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Alpha Game/ })).toBeInTheDocument();

    mocks.indexError = new Error('Search index failed');

    expect(() => {
      rerender(
        <MemoryRouter initialEntries={['/search/']}>
          <SearchPage />
        </MemoryRouter>
      );
    }).not.toThrow();

    expect(screen.getByText('Search index failed')).toBeInTheDocument();
    screen.getByRole('button', { name: 'retry' });
  });
});
