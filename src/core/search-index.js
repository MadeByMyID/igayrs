function toNumberArray(value) {
  if (!Array.isArray(value)) return [];
  const output = [];
  const seen = new Set();
  for (const item of value) {
    const numeric = Number(item);
    if (!Number.isFinite(numeric) || seen.has(numeric)) continue;
    seen.add(numeric);
    output.push(numeric);
  }
  return output;
}

function addCount(counts, key) {
  if (key === '' || key === null || key === undefined) return;
  counts[key] = (counts[key] || 0) + 1;
}

function setHasAny(source, wanted) {
  if (!wanted?.size) return true;
  for (const value of wanted) {
    if (source.includes(value)) return true;
  }
  return false;
}

function setHasEvery(source, wanted) {
  if (!wanted?.size) return true;
  for (const value of wanted) {
    if (!source.includes(value)) return false;
  }
  return true;
}

export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function fuzzyScoreNormalized(query, text) {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(text);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const idx = t.indexOf(q);
  if (idx !== -1) return (idx === 0 || t[idx - 1] === ' ' || t[idx - 1] === '-') ? 80 : 70;

  const queryWords = q.split(/\s+/);
  const textWords = t.split(/\s+/);
  let wordMatches = 0;
  for (const word of queryWords) {
    if (textWords.some(textWord => textWord.startsWith(word))) wordMatches++;
  }
  if (wordMatches === queryWords.length) return 60;
  if (wordMatches > 0) return 40 + (wordMatches / queryWords.length) * 15;

  let queryIndex = 0;
  let consecutiveBonus = 0;
  let lastMatch = -2;
  for (let textIndex = 0; textIndex < t.length && queryIndex < q.length; textIndex++) {
    if (t[textIndex] === q[queryIndex]) {
      if (textIndex === lastMatch + 1) consecutiveBonus += 5;
      lastMatch = textIndex;
      queryIndex++;
    }
  }
  if (queryIndex === q.length) return 20 + (q.length / t.length) * 15 + consecutiveBonus;
  return 0;
}

export function createGameSearchIndex(gameList, extractors = {}) {
  const getRatingIds = extractors.getRatingIds || (game => game?.ratings);
  const getDescriptorIds = extractors.getDescriptorIds || (game => game?.descriptors);
  const getPlatformIds = extractors.getPlatformIds || (game => game?.platforms);

  const facets = {
    ratingCounts: {},
    platformCounts: {},
    descriptorCounts: {},
    yearCounts: {}
  };

  const items = (Array.isArray(gameList) ? gameList : []).map(game => {
    const ratingIds = toNumberArray(getRatingIds(game));
    const descriptorIds = toNumberArray(getDescriptorIds(game));
    const platformIds = toNumberArray(getPlatformIds(game));
    const year = game?.releaseYear === undefined || game?.releaseYear === null ? '' : String(game.releaseYear);

    for (const id of ratingIds) addCount(facets.ratingCounts, id);
    for (const id of platformIds) addCount(facets.platformCounts, id);
    for (const id of descriptorIds) addCount(facets.descriptorCounts, id);
    addCount(facets.yearCounts, year);

    return {
      game,
      nameNorm: normalizeSearchText(game?.name),
      publisherNorm: normalizeSearchText(game?.publisherName),
      ratingIds,
      descriptorIds,
      platformIds,
      year
    };
  });

  return { items, facets };
}

export function filterIndexedGames(items, filters = {}, scoreFn = fuzzyScoreNormalized) {
  const query = normalizeSearchText(filters.query);
  const publisher = normalizeSearchText(filters.publisher);
  const ratings = filters.ratings || new Set();
  const platforms = filters.platforms || new Set();
  const descriptors = filters.descriptors || new Set();
  const years = filters.years || new Set();
  const results = [];

  for (const item of Array.isArray(items) ? items : []) {
    let score = 0;

    if (query) {
      const queryScore = scoreFn(query, item.nameNorm);
      if (queryScore <= 15) continue;
      score = queryScore;
    }

    if (publisher) {
      const publisherScore = scoreFn(publisher, item.publisherNorm);
      if (publisherScore <= 15) continue;
      score = Math.max(score, publisherScore * 0.8);
    }

    if (!setHasAny(item.ratingIds, ratings)) continue;
    if (!setHasEvery(item.platformIds, platforms)) continue;
    if (!setHasEvery(item.descriptorIds, descriptors)) continue;
    if (years?.size && !years.has(item.year)) continue;

    results.push({ game: item.game, score, item });
  }

  if (query || publisher) {
    results.sort((a, b) => b.score - a.score || a.item.nameNorm.localeCompare(b.item.nameNorm));
  }

  return results;
}
