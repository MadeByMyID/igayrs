/**
 * Security tests for Steam description rendering and HTML sanitization.
 * Validates that XSS vectors are neutralized while safe formatting is preserved.
 *
 * Requirements: 40.1, 40.2, 40.3
 */
import { describe, expect, it } from 'vitest';
import { renderSteamDescription } from '@/core/steam-description';
import { sanitizeHtml, stripHtml } from '@/shared/lib/html';

// --- Helpers ---

/**
 * Checks that a string contains no executable JavaScript patterns.
 * "Executable" means unescaped HTML that a browser would interpret as live code.
 * Entity-encoded text (e.g., `&lt;script&gt;`) is safe and NOT considered executable.
 */
function assertNoExecutableJs(output: string): void {
  // No unescaped script tags (opening or closing)
  expect(output).not.toMatch(/<\s*script[\s>]/i);
  expect(output).not.toMatch(/<\s*\/\s*script\s*>/i);

  // No unescaped event handler attributes on actual HTML elements
  // We check for patterns like: <tag ... onclick="..." where the tag is a real unescaped element
  const eventHandlers = [
    'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
    'onblur', 'onsubmit', 'onkeydown', 'onkeyup', 'onchange',
    'onmousedown', 'onmouseup', 'ondblclick', 'oncontextmenu',
    'oninput', 'onreset', 'onselect', 'ondrag', 'ondrop'
  ];
  for (const handler of eventHandlers) {
    // Match event handlers only within actual unescaped HTML tags (< ... handler= ... >)
    expect(output).not.toMatch(new RegExp(`<[^>]*\\b${handler}\\s*=`, 'i'));
  }

  // No javascript: protocol in actual href attributes of unescaped tags
  expect(output).not.toMatch(/<[^>]*href\s*=\s*["']?\s*javascript\s*:/i);

  // No unescaped iframe, object, embed tags
  expect(output).not.toMatch(/<\s*iframe[\s>]/i);
  expect(output).not.toMatch(/<\s*object[\s>]/i);
  expect(output).not.toMatch(/<\s*embed[\s>]/i);
}

// --- renderSteamDescription XSS Tests ---

describe('Security: renderSteamDescription XSS vectors', () => {
  describe('Script tag injection', () => {
    it('escapes inline script tags', () => {
      const input = '<script>alert(1)</script>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
      expect(output).not.toContain('<script>');
    });

    it('escapes script tags with attributes', () => {
      const input = '<script type="text/javascript">document.cookie</script>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes script tags with src attribute', () => {
      const input = '<script src="https://evil.com/xss.js"></script>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes script tags with mixed case', () => {
      const input = '<ScRiPt>alert(1)</ScRiPt>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes script tags with extra whitespace', () => {
      const input = '<script   >alert(1)</script  >';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes nested script tags', () => {
      const input = '<script><script>alert(1)</script></script>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });
  });

  describe('Event handler injection', () => {
    it('escapes img onerror handler', () => {
      const input = '<img onerror="alert(1)" src="x">';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes div onclick handler', () => {
      const input = '<div onclick="alert(1)">click me</div>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes body onload handler', () => {
      const input = '<body onload="alert(1)">content</body>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes svg onload handler', () => {
      const input = '<svg onload="alert(1)"></svg>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes input onfocus handler', () => {
      const input = '<input onfocus="alert(1)" autofocus>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes multiple event handlers on one element', () => {
      const input = '<div onclick="alert(1)" onmouseover="alert(2)" onkeydown="alert(3)">test</div>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });
  });

  describe('Encoded XSS payloads', () => {
    it('escapes HTML entity encoded script tags', () => {
      const input = '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes decimal entity encoded script tags', () => {
      const input = '&#60;script&#62;alert(1)&#60;/script&#62;';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes javascript: URL protocol', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes javascript: URL with encoding', () => {
      const input = '<a href="&#106;avascript:alert(1)">click</a>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes data: URL with base64 payload', () => {
      const input = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">click</a>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes null byte injection', () => {
      const input = '<scr\x00ipt>alert(1)</script>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });

    it('escapes unicode escape sequences in event handlers', () => {
      const input = '<div on\u0063lick="alert(1)">test</div>';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
    });
  });

  describe('Safe formatting preservation', () => {
    it('preserves paragraph structure in output', () => {
      const input = 'First paragraph\n\nSecond paragraph';
      const output = renderSteamDescription(input);
      expect(output).toContain('<p>');
      expect(output).toContain('First paragraph');
      expect(output).toContain('Second paragraph');
    });

    it('preserves list items from bullet points', () => {
      const input = 'Key Features Include\n- Item one\n- Item two\n- Item three';
      const output = renderSteamDescription(input);
      expect(output).toContain('<li>');
      expect(output).toContain('Item one');
      expect(output).toContain('Item two');
      expect(output).toContain('Item three');
    });

    it('preserves section headings', () => {
      const input = 'About This Game\nThis is a great game with many features.';
      const output = renderSteamDescription(input);
      expect(output).toContain('<h3>');
      expect(output).toContain('About This Game');
    });

    it('renders safe content alongside escaped dangerous content', () => {
      const input = 'Safe paragraph\n<script>alert(1)</script>\nAnother safe line';
      const output = renderSteamDescription(input);
      assertNoExecutableJs(output);
      expect(output).toContain('Safe paragraph');
      expect(output).toContain('Another safe line');
    });
  });
});

// --- sanitizeHtml XSS Tests ---

describe('Security: sanitizeHtml XSS vectors', () => {
  describe('Script tag removal', () => {
    it('removes basic script tags', () => {
      const output = sanitizeHtml('<script>alert(1)</script>');
      assertNoExecutableJs(output);
      expect(output).toBe('');
    });

    it('removes script tags with content around them', () => {
      const output = sanitizeHtml('<p>Hello</p><script>alert(1)</script><p>World</p>');
      assertNoExecutableJs(output);
      expect(output).toContain('Hello');
      expect(output).toContain('World');
    });

    it('removes script tags with various attributes', () => {
      const output = sanitizeHtml('<script type="text/javascript" src="evil.js" defer async></script>');
      assertNoExecutableJs(output);
    });
  });

  describe('Event handler removal', () => {
    it('removes onerror from img tags', () => {
      const output = sanitizeHtml('<img onerror="alert(1)" src="x">');
      assertNoExecutableJs(output);
    });

    it('removes onclick from allowed tags', () => {
      const output = sanitizeHtml('<p onclick="alert(1)">text</p>');
      assertNoExecutableJs(output);
      expect(output).toContain('text');
    });

    it('removes onmouseover from span', () => {
      const output = sanitizeHtml('<span onmouseover="alert(1)">hover me</span>');
      assertNoExecutableJs(output);
      expect(output).toContain('hover me');
    });
  });

  describe('Encoded payload handling', () => {
    it('handles HTML entity encoded script tags safely', () => {
      const output = sanitizeHtml('&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;');
      assertNoExecutableJs(output);
    });

    it('handles decimal entity encoded payloads', () => {
      const output = sanitizeHtml('&#60;script&#62;alert(1)&#60;/script&#62;');
      assertNoExecutableJs(output);
    });

    it('removes javascript: URLs from href', () => {
      const output = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      assertNoExecutableJs(output);
    });

    it('removes data: URLs from href', () => {
      const output = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>');
      assertNoExecutableJs(output);
    });
  });

  describe('Safe element preservation', () => {
    it('preserves paragraph tags', () => {
      const output = sanitizeHtml('<p>Hello world</p>');
      expect(output).toContain('<p>');
      expect(output).toContain('Hello world');
    });

    it('preserves list elements', () => {
      const output = sanitizeHtml('<ul><li>Item 1</li><li>Item 2</li></ul>');
      expect(output).toContain('<ul>');
      expect(output).toContain('<li>');
      expect(output).toContain('Item 1');
    });

    it('preserves heading elements', () => {
      const output = sanitizeHtml('<h1>Title</h1><h2>Subtitle</h2>');
      expect(output).toContain('<h1>');
      expect(output).toContain('<h2>');
    });

    it('preserves inline formatting', () => {
      const output = sanitizeHtml('<b>bold</b> <i>italic</i> <em>emphasis</em> <strong>strong</strong>');
      expect(output).toContain('<b>');
      expect(output).toContain('<i>');
      expect(output).toContain('<em>');
      expect(output).toContain('<strong>');
    });

    it('preserves anchor tags with safe href', () => {
      const output = sanitizeHtml('<a href="https://example.com">link</a>');
      expect(output).toContain('<a');
      expect(output).toContain('href');
      expect(output).toContain('link');
    });

    it('preserves br tags', () => {
      const output = sanitizeHtml('line 1<br>line 2');
      expect(output).toContain('<br');
    });
  });
});

// --- stripHtml XSS Tests ---

describe('Security: stripHtml XSS vectors', () => {
  it('strips script tags completely', () => {
    const output = stripHtml('<script>alert(1)</script>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('script');
  });

  it('strips event handler attributes', () => {
    const output = stripHtml('<div onclick="alert(1)">text</div>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('onclick');
    expect(output).toContain('text');
  });

  it('strips encoded XSS payloads', () => {
    const output = stripHtml('&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
  });

  it('strips iframe tags', () => {
    const output = stripHtml('<iframe src="https://evil.com"></iframe>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('iframe');
  });

  it('strips nested dangerous content', () => {
    const output = stripHtml('<div><script>alert(1)</script><p>safe</p></div>');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).toContain('safe');
  });

  it('produces clean text from complex malicious input', () => {
    const input = '<img src=x onerror=alert(1)><svg/onload=alert(1)><script>document.cookie</script>';
    const output = stripHtml(input);
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    assertNoExecutableJs(output);
  });
});
