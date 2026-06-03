import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { normalizeSteamExtras, type NormalizedSteamDetails } from '@/core/steam-normalize';

/**
 * Property 1: normalizeSteamExtras type safety
 * Validates: Requirements 3.1, 3.6
 *
 * For any input value, normalizeSteamExtras SHALL return an object where:
 * - type is a non-empty string
 * - isFree is boolean
 * - shortDescription is string
 * - headerImage is string|null
 * - genres is array of {id, description}
 * - categories is array of {id, description}
 * - platforms has boolean windows/mac/linux
 * - price is null or valid price object
 * - metacritic is null or valid metacritic object
 * - requiredAge is finite number
 * - isBanned is boolean
 */
describe('normalizeSteamExtras', () => {
  describe('Property 1: type safety across arbitrary inputs', () => {
    function assertValidResult(result: NormalizedSteamDetails): void {
      // type is a non-empty string
      expect(typeof result.type).toBe('string');
      expect(result.type.length).toBeGreaterThan(0);

      // isFree is boolean
      expect(typeof result.isFree).toBe('boolean');

      // shortDescription is string
      expect(typeof result.shortDescription).toBe('string');

      // headerImage is string or null
      expect(result.headerImage === null || typeof result.headerImage === 'string').toBe(true);

      // genres is array of {id: string, description: string}
      expect(Array.isArray(result.genres)).toBe(true);
      for (const g of result.genres) {
        expect(typeof g.id).toBe('string');
        expect(typeof g.description).toBe('string');
      }

      // categories is array of {id: string, description: string}
      expect(Array.isArray(result.categories)).toBe(true);
      for (const c of result.categories) {
        expect(typeof c.id).toBe('string');
        expect(typeof c.description).toBe('string');
      }

      // platforms has boolean windows/mac/linux
      expect(typeof result.platforms.windows).toBe('boolean');
      expect(typeof result.platforms.mac).toBe('boolean');
      expect(typeof result.platforms.linux).toBe('boolean');

      // price is null or valid price object
      if (result.price !== null) {
        expect(typeof result.price.currency).toBe('string');
        expect(Number.isFinite(result.price.initial)).toBe(true);
        expect(Number.isFinite(result.price.final)).toBe(true);
        expect(Number.isFinite(result.price.discountPercent)).toBe(true);
        expect(typeof result.price.formattedFinal).toBe('string');
        expect(typeof result.price.formattedInitial).toBe('string');
      }

      // metacritic is null or valid metacritic object
      if (result.metacritic !== null) {
        expect(Number.isFinite(result.metacritic.score)).toBe(true);
        expect(typeof result.metacritic.url).toBe('string');
      }

      // requiredAge is finite number
      expect(Number.isFinite(result.requiredAge)).toBe(true);

      // isBanned is boolean
      expect(typeof result.isBanned).toBe('boolean');
    }

    it('holds for arbitrary object inputs', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (input) => {
            const result = normalizeSteamExtras(input as Parameters<typeof normalizeSteamExtras>[0]);
            assertValidResult(result);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Example-based tests', () => {
    it('handles null input', () => {
      const result = normalizeSteamExtras(null);
      expect(result.type).toBe('game');
      expect(result.isFree).toBe(false);
      expect(result.shortDescription).toBe('');
      expect(result.headerImage).toBeNull();
      expect(result.genres).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.platforms).toEqual({ windows: false, mac: false, linux: false });
      expect(result.price).toBeNull();
      expect(result.metacritic).toBeNull();
      expect(result.requiredAge).toBe(0);
      expect(result.isBanned).toBe(false);
    });

    it('handles undefined input', () => {
      const result = normalizeSteamExtras(undefined);
      expect(result.type).toBe('game');
      expect(result.isFree).toBe(false);
    });

    it('normalizes complete valid Steam data', () => {
      const result = normalizeSteamExtras({
        type: 'game',
        is_free: false,
        short_description: 'A great game',
        header_image: 'https://cdn.steam.com/img.jpg',
        genres: [{ id: '1', description: 'Action' }],
        categories: [{ id: '2', description: 'Single-player' }],
        platforms: { windows: true, mac: false, linux: true },
        price_overview: {
          currency: 'USD',
          initial: 1999,
          final: 999,
          discount_percent: 50,
          final_formatted: '$9.99',
          initial_formatted: '$19.99'
        },
        metacritic: { score: 85, url: 'https://metacritic.com/game/test' },
        required_age: 18,
        ratings: { igrs: { banned: true } }
      });

      expect(result.type).toBe('game');
      expect(result.isFree).toBe(false);
      expect(result.shortDescription).toBe('A great game');
      expect(result.headerImage).toBe('https://cdn.steam.com/img.jpg');
      expect(result.genres).toEqual([{ id: '1', description: 'Action' }]);
      expect(result.categories).toEqual([{ id: '2', description: 'Single-player' }]);
      expect(result.platforms).toEqual({ windows: true, mac: false, linux: true });
      expect(result.price).toEqual({
        currency: 'USD',
        initial: 1999,
        final: 999,
        discountPercent: 50,
        formattedFinal: '$9.99',
        formattedInitial: '$19.99'
      });
      expect(result.metacritic).toEqual({ score: 85, url: 'https://metacritic.com/game/test' });
      expect(result.requiredAge).toBe(18);
      expect(result.isBanned).toBe(true);
    });

    it('handles partially malformed data gracefully', () => {
      const result = normalizeSteamExtras({
        type: 123,
        genres: 'not-an-array',
        platforms: null,
        metacritic: { score: 'invalid' },
        required_age: 'not-a-number'
      } as Parameters<typeof normalizeSteamExtras>[0]);

      expect(result.type).toBe('game'); // falls back since 123 is not a string
      expect(result.genres).toEqual([]);
      expect(result.platforms).toEqual({ windows: false, mac: false, linux: false });
      expect(result.metacritic).toBeNull(); // invalid score → null
      expect(result.requiredAge).toBe(0); // NaN → 0
    });
  });
});
