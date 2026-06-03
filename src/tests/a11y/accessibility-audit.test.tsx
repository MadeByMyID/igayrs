import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { configureAxe } from 'vitest-axe';
import type AxeCore from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/features/home/home-page';
import { RatingsPage } from '@/features/ratings/ratings-page';
import { SearchPage } from '@/features/search/search-page';

/**
 * Accessibility audit tests using axe-core via vitest-axe.
 * Validates: Requirements 44.1, 44.2, 44.3, 44.4
 *
 * Scoped to WCAG 2.1 Level AA rules.
 * Fails on "serious" or "critical" violations.
 * Reports: rule ID, impact, description, CSS selector, and remediation hint.
 */

// Configure axe-core for WCAG 2.1 Level AA
const axe = configureAxe({
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
});

// --- Mock data ---

const mockMeta = {
  meta: { generatedAt: '2024-01-15T10:00:00Z', totalGames: 3 },
  ratings: {
    '7': { name: 'SU', titleEn: 'Everyone', titleId: 'Semua Umur', weight: 1, color: '#4caf50' },
    '6': { name: '18+', titleEn: 'Adults Only', titleId: 'Dewasa', weight: 5, color: '#f44336' },
  },
  descriptors: {
    '3': { nameEn: 'Violence', nameId: 'Kekerasan' },
    '10': { nameEn: 'Online Interaction', nameId: 'Interaksi Daring' },
  },
  platforms: {
    '1': 'PC',
    '2': 'Nintendo Switch',
  },
};

const mockGames = [
  {
    id: 1,
    name: 'Alpha Game',
    publisherName: 'North Studio',
    releaseYear: 2024,
    ratings: [7],
    descriptors: [3],
    platforms: [1],
  },
  {
    id: 2,
    name: 'Beta Game',
    publisherName: 'South Studio',
    releaseYear: 2023,
    ratings: [6],
    descriptors: [10],
    platforms: [2],
  },
  {
    id: 3,
    name: 'Gamma Game',
    publisherName: 'East Studio',
    releaseYear: 2025,
    ratings: [7],
    descriptors: [3, 10],
    platforms: [1, 2],
  },
];

const mockIgrsData = {
  games: mockGames,
  gamesById: new Map(mockGames.map(g => [g.id, g])),
  gamesByNormalizedName: new Map(mockGames.map(g => [g.name.toLowerCase(), g])),
  meta: mockMeta,
  steamMeta: { contentDescriptors: {} },
  stats: { publisherCount: 3, platformCount: 2 },
};

// --- Mocks ---

vi.mock('@/app/providers/language-provider', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => key,
    toggleLanguage: vi.fn(),
    setLang: vi.fn(),
    unlocked: false,
    dictionaryLoading: false,
  }),
}));

vi.mock('@/app/providers/data-provider', () => ({
  useRequiredIgrsData: () => ({
    data: mockIgrsData,
    error: null,
    loading: false,
  }),
  useDataContext: () => ({
    data: mockIgrsData,
    error: null,
    loading: false,
    ensureData: vi.fn(),
  }),
}));

vi.mock('@/shared/api/steam-api', () => ({
  createSteamApi: () => ({
    findSteamMatchForGame: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-recently-viewed', () => ({
  useRecentlyViewed: () => [],
}));

vi.mock('@/shared/hooks/use-search-index', () => ({
  useSearchIndex: () => ({
    index: {
      items: mockGames.map(game => ({
        game,
        nameNorm: game.name.toLowerCase(),
        publisherNorm: game.publisherName.toLowerCase(),
        ratingIds: game.ratings || [],
        descriptorIds: game.descriptors || [],
        platformIds: game.platforms || [],
        ratingIdSet: new Set(game.ratings || []),
        descriptorIdSet: new Set(game.descriptors || []),
        platformIdSet: new Set(game.platforms || []),
        year: String(game.releaseYear),
      })),
      facets: {
        ratingCounts: { '7': 2, '6': 1 },
        platformCounts: { '1': 2, '2': 2 },
        descriptorCounts: { '3': 2, '10': 2 },
        yearCounts: { '2024': 1, '2023': 1, '2025': 1 },
      },
    },
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

// --- Helpers ---

/**
 * Filters axe results to only "serious" or "critical" violations.
 * Returns formatted violation details for reporting.
 */
function filterSeriousViolations(results: AxeCore.AxeResults): AxeCore.Result[] {
  return results.violations.filter(
    v => v.impact === 'serious' || v.impact === 'critical'
  );
}

/**
 * Formats violations into a readable report with rule ID, impact,
 * description, CSS selector, and remediation hint.
 */
function formatViolationReport(violations: AxeCore.Result[]): string {
  if (violations.length === 0) return '';

  return violations
    .map(violation => {
      const nodes = violation.nodes
        .map(node => `    Selector: ${node.target.join(', ')}`)
        .join('\n');

      return [
        `Rule: ${violation.id}`,
        `Impact: ${violation.impact}`,
        `Description: ${violation.description}`,
        `Help: ${violation.help}`,
        `Remediation: ${violation.helpUrl}`,
        `Affected elements:\n${nodes}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

/**
 * Runs axe-core on the rendered container and asserts no serious/critical violations.
 */
async function assertNoSeriousViolations(container: HTMLElement) {
  const results = await axe(container);
  const serious = filterSeriousViolations(results);

  if (serious.length > 0) {
    const report = formatViolationReport(serious);
    expect.fail(
      `Found ${serious.length} serious/critical accessibility violation(s):\n\n${report}`
    );
  }
}

// --- Tests ---

afterEach(() => {
  vi.clearAllMocks();
});

describe('Accessibility Audit - WCAG 2.1 Level AA', () => {
  it('HomePage has no serious or critical accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    );

    await assertNoSeriousViolations(container);
  });

  it('SearchPage has no serious or critical accessibility violations', async () => {
    window.scrollTo = vi.fn();

    const { container } = render(
      <MemoryRouter initialEntries={['/search/']}>
        <SearchPage />
      </MemoryRouter>
    );

    await assertNoSeriousViolations(container);
  });

  it('RatingsPage has no serious or critical accessibility violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/ratings/']}>
        <RatingsPage />
      </MemoryRouter>
    );

    await assertNoSeriousViolations(container);
  });
});
