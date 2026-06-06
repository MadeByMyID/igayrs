/**
 * Pure text normalization used by search/domain modules and Web Workers.
 */

// Pre-compiled regexes — avoids allocating new RegExp objects on every call.
const DIACRITICS_RE = /[\u0300-\u036f]/g;
const NON_ALNUM_RE = /[^a-z0-9]+/g;
const MULTI_SPACE_RE = /\s+/g;

function stringifySearchValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
}

export function normalizeSearchText(value: unknown): string {
  return stringifySearchValue(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITICS_RE, '')
    .replace(NON_ALNUM_RE, ' ')
    .trim()
    .replace(MULTI_SPACE_RE, ' ');
}
