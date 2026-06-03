import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { normalizeSearchText } from '@/shared/lib/text';

/**
 * Property 2: normalizeSearchText output invariants
 * Validates: Requirements 3.2
 *
 * For any input value, normalizeSearchText SHALL return a string that is:
 * - entirely lowercase
 * - free of diacritical marks (U+0300–U+036F)
 * - composed only of characters matching [a-z0-9 ]
 * - trimmed (no leading/trailing whitespace)
 * - no consecutive space characters
 */
describe('normalizeSearchText', () => {
  describe('Property 2: output invariants across arbitrary inputs', () => {
    it('holds for arbitrary string inputs', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const result = normalizeSearchText(input);

            // entirely lowercase (no uppercase letters)
            expect(result).toBe(result.toLowerCase());

            // free of diacritical marks
            expect(/[\u0300-\u036f]/.test(result)).toBe(false);

            // composed only of [a-z0-9 ]
            expect(/^[a-z0-9 ]*$/.test(result)).toBe(true);

            // trimmed
            expect(result).toBe(result.trim());

            // no consecutive spaces
            expect(/ {2}/.test(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('holds for arbitrary non-string inputs', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (input) => {
            const result = normalizeSearchText(input);

            // always returns a string
            expect(typeof result).toBe('string');

            // composed only of [a-z0-9 ]
            expect(/^[a-z0-9 ]*$/.test(result)).toBe(true);

            // trimmed
            expect(result).toBe(result.trim());

            // no consecutive spaces
            expect(/ {2}/.test(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Example-based tests', () => {
    it('returns empty string for empty input', () => {
      expect(normalizeSearchText('')).toBe('');
    });

    it('returns empty string for null', () => {
      expect(normalizeSearchText(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizeSearchText(undefined)).toBe('');
    });

    it('converts number input to string', () => {
      expect(normalizeSearchText(42)).toBe('42');
    });

    it('strips diacritics from accented characters', () => {
      expect(normalizeSearchText('café')).toBe('cafe');
      expect(normalizeSearchText('naïve résumé')).toBe('naive resume');
    });

    it('lowercases and removes special characters', () => {
      expect(normalizeSearchText('  Astral: Hunter!! ')).toBe('astral hunter');
    });

    it('collapses multiple spaces', () => {
      expect(normalizeSearchText('hello    world')).toBe('hello world');
    });

    it('handles objects by converting to string', () => {
      expect(normalizeSearchText({})).toBe('object object');
    });
  });
});
