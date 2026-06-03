/**
 * Pure text normalization used by search/domain modules and Web Workers.
 */
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
