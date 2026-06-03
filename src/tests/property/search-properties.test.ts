// Feature: igrs-codebase-improvements, Property 1: Search Text Normalization Idempotence
// Feature: igrs-codebase-improvements, Property 2: Fuzzy Score Bounded Output
// Feature: igrs-codebase-improvements, Property 3: Steam App ID Extraction
// **Validates: Requirements 42.1, 42.2, 42.3, 42.4, 42.5**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeSearchText } from '../../shared/lib/text';
import { fuzzyScoreNormalized } from '../../core/search-index';
import { parseSteamAppId } from '../../shared/lib/steam-domain';

// --- Generators ---

/** Generates arbitrary strings including Unicode, empty, and special characters */
function arbitrarySearchString(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.string({ minLength: 0, maxLength: 100 }),
    fc.string({ minLength: 0, maxLength: 80, unit: 'grapheme' }),
    fc.constantFrom('', ' ', '  ', '\t', '\n', '\r\n'),
    fc.string({ minLength: 1, maxLength: 50, unit: 'grapheme-ascii' })
  );
}

/** Generates strings that contain /app/{digits}/ pattern (valid Steam URLs) */
function steamUrlWithAppId(): fc.Arbitrary<string> {
  return fc.record({
    digits: fc.stringMatching(/^\d{1,10}$/),
    prefix: fc.constantFrom(
      'https://store.steampowered.com',
      'https://steamcommunity.com',
      'http://store.steampowered.com'
    ),
    suffix: fc.constantFrom('', '/', '/some-game-name/', '?l=english')
  }).map(({ digits, prefix, suffix }) => `${prefix}/app/${digits}${suffix}`);
}

/** Generates strings that are purely numeric (valid app IDs) */
function numericAppId(): fc.Arbitrary<string> {
  return fc.stringMatching(/^\d{1,10}$/);
}

/** Generates strings that should NOT match any Steam URL pattern */
function nonSteamString(): fc.Arbitrary<string> {
  return fc.oneof(
    // Plain alphabetic text that won't match any pattern
    fc.stringMatching(/^[a-z ]{3,30}$/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 0;
    }),
    fc.constantFrom(
      'hello world',
      'not a steam url',
      'https://example.com/page',
      'https://google.com/search?q=test',
      'random text with no numbers pattern',
      'abc def ghi',
      'some game title here',
      'https://example.org/path/to/resource'
    )
  );
}

// --- Property Tests ---

describe('Property 1: Search Text Normalization Idempotence', () => {
  it('normalizeSearchText applied twice produces the same result as applied once', () => {
    fc.assert(
      fc.property(arbitrarySearchString(), (s) => {
        const once = normalizeSearchText(s);
        const twice = normalizeSearchText(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 100 }
    );
  });

  it('normalizeSearchText is idempotent for strings with diacritics', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'café', 'naïve', 'résumé', 'über', 'señor', 'Ångström',
          'Ñoño', 'crème brûlée', 'Zürich', 'São Paulo'
        ),
        (s) => {
          const once = normalizeSearchText(s);
          const twice = normalizeSearchText(once);
          expect(twice).toBe(once);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Fuzzy Score Bounded Output', () => {
  it('fuzzyScoreNormalized returns a value in [0, 100] for any query and text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 0, maxLength: 50 }),
        (query, text) => {
          const score = fuzzyScoreNormalized(query, text);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fuzzyScoreNormalized returns a value in [0, 100] for Unicode inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 40, unit: 'grapheme' }),
        fc.string({ minLength: 0, maxLength: 40, unit: 'grapheme' }),
        (query, text) => {
          const score = fuzzyScoreNormalized(query, text);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: Steam App ID Extraction', () => {
  it('parseSteamAppId returns non-empty digits for valid Steam URLs with /app/{digits}/', () => {
    fc.assert(
      fc.property(steamUrlWithAppId(), (url) => {
        const result = parseSteamAppId(url);
        expect(result).not.toBe('');
        expect(result).toMatch(/^\d+$/);
      }),
      { numRuns: 100 }
    );
  });

  it('parseSteamAppId returns non-empty digits for purely numeric strings', () => {
    fc.assert(
      fc.property(numericAppId(), (numStr) => {
        const result = parseSteamAppId(numStr);
        expect(result).not.toBe('');
        expect(result).toMatch(/^\d+$/);
      }),
      { numRuns: 100 }
    );
  });

  it('parseSteamAppId returns empty string for non-matching inputs', () => {
    fc.assert(
      fc.property(nonSteamString(), (input) => {
        const result = parseSteamAppId(input);
        expect(result).toBe('');
      }),
      { numRuns: 100 }
    );
  });
});
