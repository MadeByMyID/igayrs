const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with']);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isExplicitListItem(line) {
  return /^[-*]\s*/.test(line);
}

function listText(line) {
  return line.replace(/^[-*]\s*/, '').trim();
}

function isLikelyListValue(line) {
  return /\s-\s/.test(line) || /\d/.test(line) || /^@/.test(line);
}

function titleCaseRatio(line) {
  const words = line
    .replace(/[:;,.!?()[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 2) return 0;

  let titleWords = 0;
  for (const word of words) {
    const normalized = word.toLowerCase();
    if (SMALL_WORDS.has(normalized) || /^[A-Z0-9]/.test(word)) titleWords += 1;
  }
  return titleWords / words.length;
}

function isLikelyHeading(line, nextLine) {
  if (!nextLine || isExplicitListItem(line)) return false;
  if (line.length > 64) return false;
  if (!/[a-z]/i.test(line)) return false;
  if (/[.!?)]$/.test(line)) return false;
  if (isLikelyListValue(line)) return false;
  if (/:$/.test(line)) return true;
  return titleCaseRatio(line) >= 0.75;
}

function shouldAppendToPreviousListItem(line, section) {
  return section?.list.length > 0 && /^[a-z]/.test(line) && line.length <= 120;
}

function isCompactFeatureLine(line) {
  return line.length <= 150 && !/[?]$/.test(line);
}

function parseSteamDescription(text) {
  const lines = String(text || '')
    .split(/\r?\n/g)
    .map(cleanLine)
    .filter(Boolean);

  const intro = [];
  const sections = [];
  let currentSection = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] || '';

    if (isLikelyHeading(line, nextLine)) {
      currentSection = {
        heading: line.replace(/:$/, ''),
        paragraphs: [],
        list: []
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      intro.push(listText(line));
      continue;
    }

    if (isExplicitListItem(line)) {
      currentSection.list.push(listText(line));
      continue;
    }

    if (shouldAppendToPreviousListItem(line, currentSection)) {
      const lastIndex = currentSection.list.length - 1;
      currentSection.list[lastIndex] = `${currentSection.list[lastIndex]} ${line}`;
      continue;
    }

    if (isCompactFeatureLine(line)) {
      currentSection.list.push(line);
    } else {
      currentSection.paragraphs.push(line);
    }
  }

  return { intro, sections };
}

function renderParagraphs(items) {
  return items.map(item => `<p>${escapeHtml(item)}</p>`).join('');
}

function renderList(items) {
  if (!items.length) return '';
  return `<ul class="steam-description-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export function renderSteamDescription(text) {
  const { intro, sections } = parseSteamDescription(text);
  const introHtml = intro.length
    ? `<div class="steam-description-intro">${renderParagraphs(intro)}</div>`
    : '';
  const sectionsHtml = sections.map(section => `
    <section class="steam-description-section">
      <h3>${escapeHtml(section.heading)}</h3>
      ${renderParagraphs(section.paragraphs)}
      ${renderList(section.list)}
    </section>
  `).join('');

  return `<div class="steam-description">${introHtml}${sectionsHtml}</div>`;
}
