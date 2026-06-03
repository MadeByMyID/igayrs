import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPage } from '@/features/search/search-page';

const searchData = {
  games: [
    {
      id: 1,
      name: 'Alpha Game',
      publisherName: 'North Studio',
      releaseYear: 2026,
      ratings: [7],
      descriptors: [3],
      platforms: [1]
    },
    {
      id: 2,
      name: 'Beta Game',
      publisherName: 'South Studio',
      releaseYear: 2024,
      ratings: [6],
      descriptors: [10],
      platforms: [2]
    }
  ],
  meta: {
    descriptors: {
      3: { nameEn: 'Violence', nameId: 'Kekerasan' },
      10: { nameEn: 'Online Interaction', nameId: 'Interaksi Daring' }
    },
    platforms: {
      1: 'PC',
      2: 'Nintendo Switch'
    },
    ratings: {
      6: { name: '18+', titleEn: 'Adults', weight: 5 },
      7: { name: 'SU', titleEn: 'Everyone', weight: 1 }
    }
  },
  steamMeta: { contentDescriptors: {} }
};

vi.mock('@/app/providers/language-provider', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => key,
    toggleLanguage: vi.fn(),
    unlocked: false,
    dictionaryLoading: false
  })
}));

vi.mock('@/app/providers/data-provider', () => ({
  useRequiredIgrsData: () => ({
    data: searchData,
    error: null,
    loading: false
  })
}));

vi.mock('@/shared/api/steam-api', () => ({
  createSteamApi: () => ({
    findSteamMatchForGame: vi.fn()
  })
}));

describe('SearchPage filters', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('lets users remove one active filter without clearing the rest', async () => {
    render(
      <MemoryRouter initialEntries={['/search/?rating=6&platform=2']}>
        <SearchPage />
      </MemoryRouter>
    );

    const activeFilters = screen.getByLabelText('search.active');
    fireEvent.click(within(activeFilters).getByRole('button', { name: 'filter.rating: 18+' }));

    expect(screen.queryByRole('button', { name: 'filter.rating: 18+' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'filter.platform: Nintendo Switch' })).toBeInTheDocument();
  });

  it('sorts filtered results by title when requested from the URL', () => {
    render(
      <MemoryRouter initialEntries={['/search/?sort=title-desc']}>
        <SearchPage />
      </MemoryRouter>
    );

    const cards = screen.getAllByRole('button', { name: /Game/ });
    expect(cards[0]).toHaveTextContent('Beta Game');
    expect(cards[1]).toHaveTextContent('Alpha Game');
  });
});
