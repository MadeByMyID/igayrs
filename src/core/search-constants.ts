/**
 * Constants used by search and Steam matching modules.
 *
 * These constants define word lists and penalty rules that control how game
 * titles are normalized, tokenized, and scored during search and Steam store
 * matching operations.
 */

/**
 * Words commonly found in game title variants (e.g. "Deluxe Edition",
 * "Remastered") that do not contribute meaningful search signal.
 *
 * These are stripped from titles before comparison so that "Game: Deluxe Edition"
 * and "Game: Standard Edition" are treated as equivalent base titles.
 */
export const WEAK_TITLE_WORDS: ReadonlySet<string> = new Set([
  'edition',
  'deluxe',
  'ultimate',
  'standard',
  'complete',
  'definitive',
  'enhanced',
  'remastered',
  'remake',
]);

/**
 * Common English stop words that carry no semantic weight in game title matching.
 *
 * Filtered out during tokenization so that scoring focuses on meaningful content
 * words rather than articles and prepositions.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'for',
  'of',
  'the',
]);

/**
 * Penalty rules applied to Steam search candidates that appear to be add-on
 * content rather than the base game.
 *
 * Each entry has a regex `pattern` tested against the normalized candidate name
 * and a numeric `value` subtracted from the candidate's match score. Higher
 * values indicate stronger confidence that the candidate is not the base game.
 */
export const ADDON_PENALTIES: readonly { readonly pattern: RegExp; readonly value: number }[] = [
  { pattern: /\b(soundtrack|ost)\b/, value: 45 },
  { pattern: /\b(demo|trial)\b/, value: 35 },
  { pattern: /\b(attachment|costume|item|booster|currency)\s+pack\b/, value: 30 },
  { pattern: /\bpack\b/, value: 20 },
];
