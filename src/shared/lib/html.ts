/**
 * HTML processing, sanitization, and extra field formatting utilities.
 *
 * Uses DOMPurify for secure HTML sanitization with a strict allowlist
 * of safe tags and attributes.
 */
import DOMPurify from 'dompurify';
import { EXTRA_FIELD_PATCHED_LEGACY_TEXT, EXTRA_FIELD_PATCHED_TOKEN } from '@/core/constants';
import { safeHttpUrl } from '@/core/safe-render';

const ALLOWED_TAGS = [
  'p', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'b', 'strong', 'i', 'em', 'a', 'br', 'span',
  'div', 'section'
];

const ALLOWED_ATTRS = ['href', 'target', 'rel', 'class'];

/**
 * Sanitizes an HTML string, preserving only safe formatting elements.
 * Removes all script tags, iframes, objects, embeds, and event handler attributes.
 *
 * @param dirty - The untrusted HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering via dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS
  });
}

/**
 * Strips all HTML from a string, returning clean plain text.
 * Handles nested tags, HTML entities, and malformed markup safely.
 *
 * @param value - The value to strip HTML from (coerced to string)
 * @returns Plain text with no HTML tags or residual markup
 */
export function stripHtml(value: unknown): string {
  if (!value) return '';
  const raw = String(value)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*hr\b[^>]*>/gi, '\n');

  const stripped = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  return stripped
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b|\u200c|\u200d|\ufeff/g, '')
    .replace(/[\u25a0\u25a1\u25aa\u25ab\u25cf]/g, ' ')
    .replace(/-{4,}/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function formatExtraField(value: unknown, linksPatchedLabel: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text === EXTRA_FIELD_PATCHED_TOKEN || text === EXTRA_FIELD_PATCHED_LEGACY_TEXT) {
    return linksPatchedLabel;
  }
  return safeHttpUrl(text)?.href || text;
}
