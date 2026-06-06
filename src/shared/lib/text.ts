/**
 * Text utilities shared across search, domain, and Steam modules.
 */

import type { ReactNode } from 'react';
import { createElement } from 'react';
export { normalizeSearchText } from '@/core/search-text';

// Cache the last compiled highlight regex to avoid re-creating it for every card
// in a search results list (same query applies to all visible cards).
let _hlCache: { query: string; regex: RegExp; lower: string } | null = null;

function getHighlightRegex(trimmed: string): { regex: RegExp; lower: string } {
  if (_hlCache && _hlCache.query === trimmed) return _hlCache;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entry = { query: trimmed, regex: new RegExp(`(${escaped})`, 'gi'), lower: trimmed.toLowerCase() };
  _hlCache = entry;
  return entry;
}

/**
 * Highlights occurrences of `query` within `text` by wrapping matched
 * portions in `<mark>` elements. Matching is case-insensitive.
 *
 * @param text - The source text to highlight within.
 * @param query - The search query to highlight. If empty/whitespace, returns text unchanged.
 * @returns A ReactNode with matched portions wrapped in `<mark>` elements,
 *          or the original string if no match is found.
 */
export function highlight(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const { regex, lower } = getHighlightRegex(trimmed);
  // Reset lastIndex since regex is reused with 'g' flag
  regex.lastIndex = 0;
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    part.toLowerCase() === lower
      ? createElement('mark', { key: index }, part)
      : part
  );
}
