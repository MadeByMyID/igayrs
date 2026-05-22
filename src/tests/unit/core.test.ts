import { describe, expect, it, vi } from 'vitest';
import { assertGamesPayload, assertMetaPayload, normalizeExtraPayload, normalizeSteamMetaPayload } from '@/core/data-contracts';
import { esc, safeExternalLink, safeHttpUrl } from '@/core/safe-render';
import { createGameSearchIndex, filterIndexedGames, fuzzyScoreNormalized, normalizeSearchText } from '@/core/search-index';
import { renderSteamDescription } from '@/core/steam-description';
import { buildSteamReviewsUrl, normalizeSteamReviewSummary } from '@/core/steam-reviews';
import { buildSteamSearchQueries, buildSteamStoreSearchUrl, normalizeSteamSearchPayload, selectSteamSearchResult } from '@/core/steam-search';
import { buildSearchParams, readSearchState } from '@/core/url-state';
import { getDescriptorGuideCopy } from '@/core/descriptor-guide';
import { getRatingGuideCopy } from '@/core/rating-guide';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { normalizeSteamProxyBase } from '@/shared/api/steam-api';
import { buildSteamRatingComparison } from '@/shared/lib/domain';

describe('safe rendering helpers', () => {
  it('reject unsafe links and escape labels', () => {
    expect(esc('<img src=x onerror=1> & "x"')).toBe('&lt;img src=x onerror=1&gt; &amp; &quot;x&quot;');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('ftp://example.com/file')).toBeNull();
    expect(safeHttpUrl('https://example.com/a b')?.href).toBe('https://example.com/a%20b');
    expect(safeExternalLink('javascript:alert(1)', '<b>bad</b>')).toBe('');
    expect(safeExternalLink('https://example.com/path?q=1', '<Open>')).toContain('&lt;Open&gt;');
  });
});

describe('clipboard helper', () => {
  it('falls back to textarea copy when async clipboard write is rejected', async () => {
    const originalClipboard = navigator.clipboard;
    const originalSecureContext = window.isSecureContext;
    const execCommand = document.execCommand;
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard permission denied'));
    const execSpy = vi.fn().mockReturnValue(true);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true
    });
    document.execCommand = execSpy;

    try {
      await expect(copyTextToClipboard('share-url')).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('share-url');
      expect(execSpy).toHaveBeenCalledWith('copy');
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard
      });
      Object.defineProperty(window, 'isSecureContext', {
        configurable: true,
        value: originalSecureContext
      });
      document.execCommand = execCommand;
    }
  });
});

describe('data contracts', () => {
  it('validate data with stable codes and safe fallbacks', () => {
    const meta = {
      ratings: { 7: { name: 'SU' } },
      descriptors: { 1: { nameEn: 'Violence' } },
      platforms: { 1: 'PC' }
    };
    expect(assertMetaPayload(meta)).toEqual(meta);
    expect(assertGamesPayload([{ id: 1, name: 'Game', publisherName: 'Publisher', releaseYear: 2026, ratings: [7] }])).toHaveLength(1);
    expect(() => assertGamesPayload([{ id: '1', name: 'Broken' }])).toThrowError(expect.objectContaining({ code: 'DATA_INVALID_GAMES' }));
    expect(normalizeSteamMetaPayload(null)).toEqual({ contentDescriptors: {} });
    expect(normalizeExtraPayload({ games: [{ id: 1, videoUrl: 'https://example.com' }] })).toEqual({ games: [{ id: 1, videoUrl: 'https://example.com' }] });
  });
});

describe('search and URL state', () => {
  it('precomputes facets and filters by relevance', () => {
    const games = [
      { id: 1, name: 'Astral Hunter', publisherName: 'Red Studio', releaseYear: 2026, ratings: [7], platforms: [1], descriptors: [3] },
      { id: 2, name: 'Metro Puzzle', publisherName: 'Blue Studio', releaseYear: 2024, ratings: [6], platforms: [2], descriptors: [4] },
      { id: 3, name: 'Hunter Academy', publisherName: 'Red Studio', releaseYear: 2026, ratings: [5], platforms: [1, 2], descriptors: [3, 4] }
    ];
    const index = createGameSearchIndex(games);
    expect(index.facets.platformCounts[1]).toBe(2);

    const results = filterIndexedGames(index.items, {
      query: 'astr hunt',
      publisher: 'red',
      ratings: new Set([7, 5]),
      platforms: new Set([1]),
      descriptors: new Set([3]),
      years: new Set(['2026'])
    }, fuzzyScoreNormalized);

    expect(results).toHaveLength(2);
    expect(results[0]?.game.id).toBe(1);
    expect(normalizeSearchText('  Astral: Hunter!! ')).toBe('astral hunter');
  });

  it('round trips compact sanitized URL state', () => {
    const state = readSearchState(new URLSearchParams('q=%20Zelda%20&publisher=Nintendo&rating=7,x,6&platform=1&descriptor=2,NaN&year=2025,abcd&page=3&sort=year-desc'));
    expect(state.query).toBe('Zelda');
    expect([...state.ratings]).toEqual([7, 6]);
    expect([...state.descriptors]).toEqual([2]);
    expect(state.page).toBe(3);
    expect(state.sort).toBe('year-desc');

    const params = buildSearchParams({
      query: 'Mario',
      publisher: '',
      ratings: new Set([6, 7]),
      platforms: new Set([1]),
      descriptors: new Set(),
      years: new Set(['2026']),
      page: 2,
      sort: 'title-asc'
    });
    expect(String(params)).toBe('q=Mario&rating=6%2C7&platform=1&year=2026&page=2&sort=title-asc');
    expect(readSearchState(new URLSearchParams('sort=not-real')).sort).toBe('relevance');
  });
});

describe('rating and descriptor guide copy', () => {
  it('keeps localized structured guidance available', () => {
    expect(getRatingGuideCopy(7, 'en').watchFor.length).toBeGreaterThanOrEqual(6);
    expect(getRatingGuideCopy(6, 'id').summary.toLowerCase()).toContain('dewasa');
    expect(getDescriptorGuideCopy(10, 'en').sections.length).toBeGreaterThanOrEqual(3);
    expect(getDescriptorGuideCopy(15, 'id').summary.toLowerCase()).toContain('judi');
  });
});

describe('Steam helpers', () => {
  it('requires configured Steam proxy bases to be HTTPS and allowlisted', () => {
    expect(normalizeSteamProxyBase(undefined)).toBe('https://cors.mefi.workers.dev/');
    expect(normalizeSteamProxyBase('https://proxy.test/base/', ['https://proxy.test/base/'])).toBe('https://proxy.test/base/');
    expect(() => normalizeSteamProxyBase('http://proxy.test/', ['http://proxy.test/'])).toThrowError('STEAM_PROXY_INSECURE');
    expect(() => normalizeSteamProxyBase('https://evil.test/', ['https://proxy.test/'])).toThrowError('STEAM_PROXY_NOT_ALLOWED');
  });

  it('formats Steam descriptions as escaped readable sections', () => {
    const html = renderSteamDescription([
      'Start Small. Command Everything.',
      'Build Your Empire',
      'Construct space stations, establish trade networks, and control production chains.',
      '* Engage in real-time combat.',
      '<script>alert(1)</script>'
    ].join('\n'));

    expect(html).toContain('class="steam-description"');
    expect(html).toContain('<h3>Build Your Empire</h3>');
    expect(html).toContain('<li>Engage in real-time combat.</li>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('normalizes review summaries and Steam search results', () => {
    expect(buildSteamReviewsUrl('392160')).toBe('https://store.steampowered.com/appreviews/392160?json=1&filter=recent&language=all&review_type=all&purchase_type=all&num_per_page=1');
    expect(buildSteamReviewsUrl('12x34')).toBeNull();
    expect(normalizeSteamReviewSummary({
      success: 1,
      query_summary: {
        review_score: 8,
        review_score_desc: 'Very Positive',
        total_positive: 12543,
        total_negative: 1200,
        total_reviews: 13743
      }
    })?.positivePercent).toBe(91);

    expect(buildSteamSearchQueries({ name: 'Bioskop Simulator / Movie Cinema Simulator' })).toContain('movie cinema simulator');
    expect(buildSteamStoreSearchUrl('tales of arise beyond the dawn')).toBe('https://store.steampowered.com/api/storesearch/?term=tales%20of%20arise%20beyond%20the%20dawn&l=en&cc=US');

    const candidates = normalizeSteamSearchPayload({ items: [{ id: 2682120, name: 'Movie Cinema Simulator', type: 'app' }] });
    const result = selectSteamSearchResult({ name: 'Bioskop Simulator / Movie Cinema Simulator' }, candidates);
    expect(result.status).toBe('match');
    expect(result.match?.appId).toBe('2682120');
  });

  it('summarizes Steam, local, and computed rating differences', () => {
    expect(buildSteamRatingComparison({
      computedDescriptorIds: [3, 10],
      computedRatingId: 6,
      localDescriptorIds: [3, 10],
      localRatingId: 6,
      steamDescriptorIds: [3],
      steamRatingId: 5
    })).toEqual({
      descriptorStatus: 'missing-steam',
      missingFromSteamDescriptorIds: [10],
      ratingStatus: 'mismatch',
      unexpectedSteamDescriptorIds: []
    });
  });
});
