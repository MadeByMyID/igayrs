// Feature: igrs-codebase-improvements, Property 4: HTML Sanitization Removes Dangerous Elements
// Feature: igrs-codebase-improvements, Property 5: HTML Sanitization Preserves Safe Elements
// Feature: igrs-codebase-improvements, Property 6: HTML Stripping Produces Clean Plain Text
// **Validates: Requirements 18.1, 18.2, 18.3, 21.1, 21.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sanitizeHtml, stripHtml } from '../../shared/lib/html';

// --- Generators ---

const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed'] as const;
const EVENT_HANDLERS = [
  'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
  'onblur', 'onsubmit', 'onkeydown', 'onkeyup', 'onchange'
] as const;

/** Generates HTML containing at least one dangerous tag */
function dangerousTagHtml(): fc.Arbitrary<string> {
  return fc.record({
    tag: fc.constantFrom(...DANGEROUS_TAGS),
    content: fc.string({ minLength: 0, maxLength: 30 }),
    prefix: fc.string({ minLength: 0, maxLength: 20 }),
    suffix: fc.string({ minLength: 0, maxLength: 20 })
  }).map(({ tag, content, prefix, suffix }) => {
    if (tag === 'br') {
      return `${prefix}<${tag}>${suffix}`;
    }
    return `${prefix}<${tag}>${content}</${tag}>${suffix}`;
  });
}

/** Generates HTML containing at least one event handler attribute */
function eventHandlerHtml(): fc.Arbitrary<string> {
  return fc.record({
    handler: fc.constantFrom(...EVENT_HANDLERS),
    payload: fc.string({ minLength: 1, maxLength: 30 }),
    tag: fc.constantFrom('div', 'span', 'p', 'img', 'a'),
    content: fc.string({ minLength: 0, maxLength: 20 })
  }).map(({ handler, payload, tag, content }) => {
    return `<${tag} ${handler}="${payload}">${content}</${tag}>`;
  });
}

/** Generates HTML containing only safe formatting elements */
function safeOnlyHtml(): fc.Arbitrary<string> {
  return fc.oneof(
    // Simple safe tag with text content
    fc.record({
      tag: fc.constantFrom('p', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'strong', 'i', 'em'),
      content: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>'))
    }).map(({ tag, content }) => `<${tag}>${content}</${tag}>`),
    // Anchor tag with href
    fc.record({
      href: fc.webUrl(),
      text: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('<') && !s.includes('>'))
    }).map(({ href, text }) => `<a href="${href}">${text}</a>`),
    // br tag (self-closing)
    fc.constant('<br>')
  );
}

/** Generates arbitrary HTML strings including nested tags, entities, and malformed markup.
 *  All generated strings contain at least one HTML tag structure. */
function arbitraryHtml(): fc.Arbitrary<string> {
  return fc.oneof(
    // Normal HTML with tags
    fc.record({
      tag: fc.constantFrom('div', 'p', 'span', 'b', 'i', 'script', 'a', 'ul', 'li', 'h1'),
      content: fc.string({ minLength: 0, maxLength: 50 }).filter(s => !s.includes('<') && !s.includes('>'))
    }).map(({ tag, content }) => `<${tag}>${content}</${tag}>`),
    // Nested tags
    fc.record({
      outer: fc.constantFrom('div', 'p', 'ul'),
      inner: fc.constantFrom('span', 'b', 'i', 'li', 'a'),
      content: fc.string({ minLength: 0, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>'))
    }).map(({ outer, inner, content }) => `<${outer}><${inner}>${content}</${inner}></${outer}>`),
    // HTML entities within tags
    fc.constantFrom(
      '<p>&amp; &lt; &gt; &quot; &#39;</p>',
      '<p>&nbsp;&mdash;&hellip;</p>',
      '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>'
    ),
    // Malformed markup (unclosed tags, mismatched)
    fc.string({ minLength: 1, maxLength: 40 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `<p>${s}`),
    fc.string({ minLength: 1, maxLength: 40 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `<div><span>${s}</div>`),
    // Tags with attributes
    fc.record({
      tag: fc.constantFrom('div', 'p', 'span', 'a'),
      attr: fc.constantFrom('class="test"', 'id="x"', 'style="color:red"'),
      content: fc.string({ minLength: 0, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>'))
    }).map(({ tag, attr, content }) => `<${tag} ${attr}>${content}</${tag}>`)
  );
}

// --- Property Tests ---

describe('Property 4: HTML Sanitization Removes Dangerous Elements', () => {
  it('sanitizeHtml removes all dangerous tags from output', () => {
    fc.assert(
      fc.property(dangerousTagHtml(), (html) => {
        const result = sanitizeHtml(html);

        // Output must not contain any dangerous tags (opening or self-closing)
        for (const tag of DANGEROUS_TAGS) {
          const openingPattern = new RegExp(`<\\s*${tag}[\\s>]`, 'i');
          const closingPattern = new RegExp(`<\\s*/\\s*${tag}\\s*>`, 'i');
          expect(result).not.toMatch(openingPattern);
          expect(result).not.toMatch(closingPattern);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sanitizeHtml removes all event handler attributes from output', () => {
    fc.assert(
      fc.property(eventHandlerHtml(), (html) => {
        const result = sanitizeHtml(html);

        // Output must not contain any event handler attributes
        for (const handler of EVENT_HANDLERS) {
          const pattern = new RegExp(`\\b${handler}\\s*=`, 'i');
          expect(result).not.toMatch(pattern);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sanitizeHtml removes dangerous tags even when mixed with safe content', () => {
    fc.assert(
      fc.property(
        fc.record({
          safeContent: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('<') && !s.includes('>')),
          dangerousTag: fc.constantFrom(...DANGEROUS_TAGS),
          dangerousContent: fc.string({ minLength: 0, maxLength: 20 })
        }),
        ({ safeContent, dangerousTag, dangerousContent }) => {
          const html = `<p>${safeContent}</p><${dangerousTag}>${dangerousContent}</${dangerousTag}>`;
          const result = sanitizeHtml(html);

          // Dangerous tag must be removed
          const openingPattern = new RegExp(`<\\s*${dangerousTag}[\\s>]`, 'i');
          expect(result).not.toMatch(openingPattern);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: HTML Sanitization Preserves Safe Elements', () => {
  it('sanitizeHtml preserves safe formatting elements in output', () => {
    fc.assert(
      fc.property(safeOnlyHtml(), (html) => {
        const result = sanitizeHtml(html);

        // For br tags, check that <br> is preserved (DOMPurify may normalize to <br>)
        if (html === '<br>') {
          expect(result).toContain('<br');
          return;
        }

        // For anchor tags, check the <a> tag is preserved
        if (html.startsWith('<a ')) {
          expect(result).toContain('<a');
          return;
        }

        // For other safe tags, the tag should be preserved in output
        const tagMatch = html.match(/^<(\w+)/);
        if (tagMatch) {
          const tag = tagMatch[1];
          const openingPattern = new RegExp(`<${tag}[\\s>]`, 'i');
          expect(result).toMatch(openingPattern);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('sanitizeHtml preserves text content within safe elements', () => {
    fc.assert(
      fc.property(
        fc.record({
          tag: fc.constantFrom('p', 'b', 'strong', 'i', 'em', 'h1', 'h2', 'h3', 'li'),
          content: fc.string({ minLength: 1, maxLength: 30 }).filter(s =>
            !s.includes('<') && !s.includes('>') && !s.includes('&')
          )
        }),
        ({ tag, content }) => {
          const html = `<${tag}>${content}</${tag}>`;
          const result = sanitizeHtml(html);

          // The text content should be preserved
          expect(result).toContain(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sanitizeHtml preserves href attribute on anchor tags', () => {
    fc.assert(
      fc.property(
        fc.record({
          url: fc.webUrl(),
          text: fc.string({ minLength: 1, maxLength: 20 }).filter(s =>
            !s.includes('<') && !s.includes('>') && !s.includes('"') && !s.includes('&')
          )
        }),
        ({ url, text }) => {
          const html = `<a href="${url}">${text}</a>`;
          const result = sanitizeHtml(html);

          // The anchor tag and href attribute should be preserved
          expect(result).toContain('<a');
          expect(result).toContain('href=');
          // Text content should be preserved (no HTML-special chars in text)
          expect(result).toContain(text);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: HTML Stripping Produces Clean Plain Text', () => {
  it('stripHtml output contains no HTML tag characters', () => {
    fc.assert(
      fc.property(arbitraryHtml(), (html) => {
        const result = stripHtml(html);

        // Output must not contain < or > characters
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
      }),
      { numRuns: 100 }
    );
  });

  it('stripHtml output contains no residual markup fragments from nested tags', () => {
    fc.assert(
      fc.property(
        fc.record({
          outer: fc.constantFrom('div', 'p', 'ul', 'ol', 'section', 'article'),
          inner: fc.constantFrom('span', 'b', 'i', 'em', 'strong', 'a', 'li'),
          content: fc.string({ minLength: 1, maxLength: 30 })
        }),
        ({ outer, inner, content }) => {
          const html = `<${outer}><${inner}>${content}</${inner}></${outer}>`;
          const result = stripHtml(html);

          // No angle brackets in output
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
          // No tag-like fragments
          expect(result).not.toMatch(/<\/?[a-z]/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stripHtml handles malformed markup without leaving residual tags', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Unclosed tags
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `<p>${s}`),
          // Mismatched tags
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `<div><span>${s}</div>`),
          // Extra closing tags without content containing angle brackets
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `<p>${s}</p></div>`),
          // Nested unclosed tags
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('<') && !s.includes('>')).map(s => `<div><p><b>${s}`)
        ),
        (malformedHtml) => {
          const result = stripHtml(malformedHtml);

          // Output must be clean of any HTML tag characters
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stripHtml handles HTML entities without leaving markup', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '&lt;script&gt;alert(1)&lt;/script&gt;',
          '&amp;lt;div&amp;gt;',
          '<p>&nbsp;&mdash;&hellip;</p>',
          '&#60;img src=x&#62;',
          '&lt;iframe src="evil"&gt;&lt;/iframe&gt;'
        ),
        (htmlWithEntities) => {
          const result = stripHtml(htmlWithEntities);

          // Output must not contain actual HTML tag characters
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
        }
      ),
      { numRuns: 100 }
    );
  });
});
