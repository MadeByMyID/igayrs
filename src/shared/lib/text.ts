/**
 * Text utilities shared across search, domain, and Steam modules.
 */

import type { ReactNode } from 'react';
import { createElement } from 'react';
export { normalizeSearchText } from '@/core/search-text';

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
  const matcher = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(matcher);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase()
      ? createElement('mark', { key: index }, part)
      : part
  );
}
