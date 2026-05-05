const HTML_ESCAPE = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => HTML_ESCAPE[character]);
}

export function safeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function safeExternalLink(value, label = value) {
  const url = safeHttpUrl(value);
  if (!url) return '';
  const text = typeof label === 'string' && label.trim() ? label : url.href;
  return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
}
