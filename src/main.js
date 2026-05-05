import {
  EXTRA_FIELD_PATCHED_LEGACY_TEXT,
  EXTRA_FIELD_PATCHED_TOKEN,
  IMAGE_BASE,
  JSON_BASE,
  OFFICIAL_RATING_INFO_URL,
  RATING_ORDER
} from './core/constants.js';
import {
  assertGamesPayload,
  assertMetaPayload,
  createDataError,
  normalizeExtraPayload,
  normalizeSteamMetaPayload
} from './core/data-contracts.js';
import { getDescriptorGuideCopy } from './core/descriptor-guide.js';
import { I18N } from './core/i18n.js';
import { esc, safeExternalLink, safeHttpUrl } from './core/safe-render.js';
import {
  createGameSearchIndex,
  filterIndexedGames,
  fuzzyScoreNormalized,
  normalizeSearchText
} from './core/search-index.js';
import { icon } from './core/icons.js';
import { getRatingGuideCopy } from './core/rating-guide.js';
import { renderSteamDescription } from './core/steam-description.js';
import {
  buildSteamSearchQueries,
  buildSteamStoreSearchUrl,
  normalizeSteamSearchPayload,
  selectSteamSearchResult
} from './core/steam-search.js';
import { buildSteamReviewsUrl, normalizeSteamReviewSummary } from './core/steam-reviews.js';
import { buildSearchParams, readSearchState } from './core/url-state.js';
let lang = localStorage.getItem('igrs-lang') || 'en';
let meta = null;
let games = null;
let steamMeta = null;
let searchIndex = { items: [], facets: { ratingCounts: {}, platformCounts: {}, descriptorCounts: {}, yearCounts: {} } };

let activeRatings = new Set();
let activePlatforms = new Set();
let activeDescriptors = new Set();
let activeYears = new Set();

const PER_PAGE = 30;
let currentPage = 1;
let currentDetailId = null;
let lastListScrollY = 0;
let filterStates = null;
const DATA_FETCH_TIMEOUT_MS = 10000;
const steamSearchCache = new Map();

// toggle lang x times to reveal hidden fields
const SECRET_KEY = 'igrs-dev';
let langToggleCount = parseInt(localStorage.getItem('igrs-ltc') || '0', 10);
function isUnlocked() {
  if (localStorage.getItem(SECRET_KEY) === '1') return true;
  return /(?:^|; )UNLOCKED=true(?:;|$)/.test(document.cookie || '');
}
function checkUnlock() {
  langToggleCount++;
  localStorage.setItem('igrs-ltc', String(langToggleCount));
  if (langToggleCount >= 28 && !isUnlocked()) {
    localStorage.setItem(SECRET_KEY, '1');
    console.log('%cDeveloper fields unlocked', 'color:#22c55e;font-weight:bold');
  }
}

const IMG_RATING = id => `${IMAGE_BASE}/ratings/${id}.png`;
const DESC_EXT = {};
const IMG_DESCRIPTOR = id => `${IMAGE_BASE}/descriptors/cc-${id}.${DESC_EXT[id] || 'png'}`;

function getExtraGames(extraData) {
  if (Array.isArray(extraData)) return extraData;
  if (Array.isArray(extraData?.games)) return extraData.games;
  return null;
}

function mergeExtraGameData(extraData) {
  const extraGames = getExtraGames(extraData);
  if (!Array.isArray(extraGames) || !Array.isArray(games)) return;

  const extraById = new Map(
    extraGames
      .filter((entry) => entry && Number.isFinite(entry.id))
      .map((entry) => [entry.id, entry])
  );

  for (const game of games) {
    const extra = extraById.get(game.id);
    if (!extra) continue;
    if (extra.videoUrl !== undefined) game.videoUrl = extra.videoUrl;
    if (extra.inGameUrl !== undefined) game.inGameUrl = extra.inGameUrl;
  }
}

async function fetchJsonResource(url, options = {}) {
  const {
    fallback = null,
    required = true,
    validate = value => value
  } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DATA_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      if (!required) return fallback;
      throw createDataError('DATA_FETCH_FAILED', `Failed to load ${url}`);
    }
    return validate(await response.json());
  } catch (error) {
    if (!required) return fallback;
    if (error?.code) throw error;
    if (error?.name === 'AbortError') {
      throw createDataError('DATA_FETCH_TIMEOUT', `Timed out loading ${url}`);
    }
    throw createDataError('DATA_FETCH_FAILED', `Failed to load ${url}`);
  } finally {
    clearTimeout(timeout);
  }
}

function rebuildSearchIndex() {
  searchIndex = createGameSearchIndex(games, {
    getRatingIds: ratingIdsFromGame,
    getDescriptorIds: descriptorIdsFromGame,
    getPlatformIds: platformIdsFromGame
  });
}

async function loadData() {
  const extraPromise = isUnlocked()
    ? fetchJsonResource(`${JSON_BASE}/igrs.extra.json`, {
      fallback: null,
      required: false,
      validate: normalizeExtraPayload
    })
    : Promise.resolve(null);

  const [metaData, gamesData, steamMetaData, extraData] = await Promise.all([
    fetchJsonResource(`${JSON_BASE}/igrs.meta.json`, { validate: assertMetaPayload }),
    fetchJsonResource(`${JSON_BASE}/igrs.games.json`, { validate: assertGamesPayload }),
    fetchJsonResource(`${JSON_BASE}/steam.meta.json`, {
      fallback: { contentDescriptors: {} },
      required: false,
      validate: normalizeSteamMetaPayload
    }),
    extraPromise
  ]);
  meta = metaData;
  games = gamesData;
  steamMeta = steamMetaData;

  const extraGames = getExtraGames(extraData);
  if (Array.isArray(extraGames) && extraGames.length === 0) {
    for (const game of games) {
      if (game.videoUrl === undefined || game.videoUrl === null || game.videoUrl === '') {
        game.videoUrl = EXTRA_FIELD_PATCHED_TOKEN;
      }
      if (game.inGameUrl === undefined || game.inGameUrl === null || game.inGameUrl === '') {
        game.inGameUrl = EXTRA_FIELD_PATCHED_TOKEN;
      }
    }
  }

  if (extraData) {
    mergeExtraGameData(extraData);
  }

  rebuildSearchIndex();
}

function fuzzyScore(query, text) {
  return fuzzyScoreNormalized(query, text);
}

function searchAndFilter() {
  const gq = (document.getElementById('search-input')?.value || '').trim();
  const pq = (document.getElementById('publisher-input')?.value || '').trim();
  return filterIndexedGames(searchIndex.items, {
    query: gq,
    publisher: pq,
    ratings: activeRatings,
    platforms: activePlatforms,
    descriptors: activeDescriptors,
    years: activeYears
  }, fuzzyScoreNormalized);
}

function t(k) { return I18N[lang]?.[k] ?? I18N.en[k] ?? k; }
function formatExtraField(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text === EXTRA_FIELD_PATCHED_TOKEN || text === EXTRA_FIELD_PATCHED_LEGACY_TEXT) {
    return esc(t('detail.linksPatched'));
  }
  const link = safeExternalLink(text, text);
  if (link) return link;
  return esc(text);
}
function stripHtml(value) {
  if (!value) return '';
  const t = document.createElement('template');
  t.innerHTML = String(value)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*hr\b[^>]*>/gi, '\n');
  t.content.querySelectorAll('script, style, noscript, iframe, object, head').forEach(el => el.remove());
  return (t.content.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/[\u25a0\u25a1\u25aa\u25ab\u25cf]/g, ' ')
    .replace(/-{4,}/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
function normalizeName(value) {
  return normalizeSearchText(value);
}
function hl(text, q) {
  if (!q || !q.trim()) return esc(text);
  return esc(text).replace(new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
}
function rname(id) { return meta.ratings[id]?.name || '?'; }
function rweight(id) { return meta.ratings[id]?.weight || 0; }
function rtitle(id) { const r = meta.ratings[id]; return r ? (lang === 'id' ? r.titleId : r.titleEn) : ''; }
function rcontent(id) { const r = meta.ratings[id]; return r ? (lang === 'id' ? r.contentId : r.contentEn) : ''; }
function dname(id) { const d = meta.descriptors[id]; return d ? (lang === 'id' ? d.nameId : d.nameEn) : '?'; }
function pname(id) {
  const p = meta.platforms?.[id];
  if (!p) return String(id);
  if (typeof p === 'string') return p;
  return lang === 'id'
    ? (p.nameId || p.nameEn || p.name || String(id))
    : (p.nameEn || p.nameId || p.name || String(id));
}
function platformIdFromName(name) {
  if (!name) return null;
  for (const [id, value] of Object.entries(meta.platforms || {})) {
    const label = typeof value === 'string' ? value : (value?.nameEn || value?.nameId || value?.name);
    if (label === name) return parseInt(id, 10);
  }
  return null;
}
function platformIdsFromGame(game) {
  if (Array.isArray(game.platforms)) {
    return game.platforms
      .map(id => parseInt(id, 10))
      .filter(Number.isFinite);
  }
  if (Array.isArray(game.platformsName)) {
    const ids = [];
    const seen = new Set();
    for (const name of game.platformsName) {
      const id = platformIdFromName(name);
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }
  return [];
}
function ratingIdsFromGame(game) {
  if (!Array.isArray(game?.ratings)) return [];
  return game.ratings
    .map(id => parseInt(id, 10))
    .filter(Number.isFinite);
}
function descriptorIdsFromGame(game) {
  if (!Array.isArray(game?.descriptors)) return [];
  return game.descriptors
    .map(id => parseInt(id, 10))
    .filter(Number.isFinite);
}
function parseSteamAppId(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) return text;

  const patterns = [
    /steamcommunity\.com\/app\/(\d+)/i,
    /store\.steampowered\.com\/app\/(\d+)/i,
    /store\.steampowered\.com\/agecheck\/app\/(\d+)/i,
    /[?&]appid=(\d+)/i,
    /[?&]appids=(\d+)/i,
    /\/app\/(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}
function findGameByName(name) {
  if (!games?.length || !name) return null;
  const normalized = normalizeName(name);
  let fallback = null;
  let fallbackScore = 0;
  for (const game of games) {
    const candidate = normalizeName(game.name);
    if (candidate === normalized) return game;
    const score = fuzzyScore(normalized, candidate);
    if (score > fallbackScore) {
      fallbackScore = score;
      fallback = game;
    }
  }
  return fallbackScore >= 70 ? fallback : null;
}
function parseSteamRatingFlag(value) {
  return String(value) === '1' || value === true;
}
function steamRatingToIgrsId(steamRating) {
  const rating = String(steamRating?.rating || '').trim().toUpperCase();
  if (!rating) return null;
  if (rating === 'BANNED' || parseSteamRatingFlag(steamRating?.banned)) return 35;

  const byRating = {
    '0': 7,
    '3': 7,
    '3+': 7,
    '7': 4,
    '7+': 4,
    '13': 5,
    '13+': 5,
    '15': 28,
    '15+': 28,
    '18': 6,
    '18+': 6,
    'RC': 35
  };

  if (byRating[rating]) return byRating[rating];
  const age = Number(steamRating?.required_age);
  if (age >= 18) return 6;
  if (age >= 15) return 28;
  if (age >= 13) return 5;
  if (age >= 7) return 4;
  if (age >= 3) return 7;
  return null;
}
function getSteamDescriptorMeta(id) {
  return steamMeta?.contentDescriptors?.[String(id)] || null;
}
function computeSteamChecker(steamGame) {
  const descriptorIds = Array.isArray(steamGame?.content_descriptors?.ids)
    ? steamGame.content_descriptors.ids.map(id => Number(id)).filter(Number.isFinite)
    : [];
  const mappedDescriptors = [];
  const mappedDescriptorIds = [];
  let computedRatingId = 7;

  for (const descriptorId of descriptorIds) {
    const descriptorMeta = getSteamDescriptorMeta(descriptorId);
    if (!descriptorMeta) continue;
    mappedDescriptors.push({ id: descriptorId, ...descriptorMeta });
    for (const igrsId of descriptorMeta.igrsDescriptorIds || []) {
      const numericId = Number(igrsId);
      if (Number.isFinite(numericId) && !mappedDescriptorIds.includes(numericId)) {
        mappedDescriptorIds.push(numericId);
      }
    }
    if (descriptorMeta.ratingId && rweight(descriptorMeta.ratingId) > rweight(computedRatingId)) {
      computedRatingId = descriptorMeta.ratingId;
    }
  }

  return { descriptorIds, mappedDescriptors, mappedDescriptorIds, computedRatingId };
}
function renderRatingBadge(ratingId) {
  if (!meta?.ratings?.[ratingId]) {
    return `<span class="steam-rating-badge steam-rating-badge-muted">${esc(t('steamchecker.unknown'))}</span>`;
  }
  return `<img class="steam-rating-img" src="${IMG_RATING(ratingId)}" alt="${esc(rname(ratingId))}" loading="lazy">`;
}
function steamRequiredAgeLabel(steamRating) {
  const requiredAge = steamRating?.required_age;
  if (requiredAge === undefined || requiredAge === null || requiredAge === '') return t('steamchecker.unknown');
  const ageText = String(requiredAge);
  const mappedId = steamRatingToIgrsId(steamRating);
  return mappedId ? rname(mappedId) : ageText;
}
function renderDescriptorIcons(ids, emptyKey = 'detail.noDescriptors') {
  const cleanIds = [...new Set((ids || []).map(id => Number(id)).filter(Number.isFinite))];
  if (!cleanIds.length) return `<div class="detail-no-descriptors">${esc(t(emptyKey))}</div>`;
  return `
    <div class="descriptor-icons">
      ${cleanIds.map(id => `
        <span class="descriptor-icon">
          <img src="${IMG_DESCRIPTOR(id)}" alt="${esc(dname(id))}" loading="lazy">
          <span class="tooltip">${esc(dname(id))}</span>
        </span>
      `).join('')}
    </div>`;
}
function steamIgrsDescriptorIdsFromText(text) {
  if (!text || !meta?.descriptors) return [];
  const lines = String(text)
    .split(/\r?\n/g)
    .map(line => normalizeName(line))
    .filter(Boolean);
  if (!lines.length) return [];

  const ids = [];
  for (const line of lines) {
    for (const [id, descriptor] of Object.entries(meta.descriptors)) {
      const variants = [descriptor?.nameId, descriptor?.nameEn]
        .map(value => normalizeName(value))
        .filter(Boolean);
      if (!variants.length) continue;
      if (variants.some(variant => variant === line || variant.includes(line) || line.includes(variant))) {
        const numericId = Number(id);
        if (Number.isFinite(numericId) && !ids.includes(numericId)) ids.push(numericId);
      }
    }
  }
  return ids;
}
function formatLocalDateTime24(isoString) {
  if (!isoString) return '-';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '-';
  const datePart = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dt);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dt);
  return `${datePart} ${timePart}`;
}

function formatCount(value) {
  return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(Number(value) || 0);
}

function renderReviewTokens(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const visible = items.slice(0, 3);
  const tokens = visible.map(item => `<span>${esc(item)}</span>`).join('');
  return items.length > visible.length
    ? `${tokens}<span class="descriptor-review-more">etc.</span>`
    : tokens;
}

function toggle(set, val) { set.has(val) ? set.delete(val) : set.add(val); }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchJsonWithTimeout(url, timeoutMs = 10000, options = {}) {
  const retries = Number.isFinite(options.retries) ? Math.max(0, options.retries) : 2;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(t('steamchecker.error.load'));
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      const jitter = Math.floor(Math.random() * 80);
      await wait(Math.min(1200, 250 * (2 ** attempt)) + jitter);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(t('steamchecker.error.load'));
}

async function fetchSteamReviewSummary(appId) {
  const reviewUrl = buildSteamReviewsUrl(appId);
  if (!reviewUrl) return null;
  try {
    const payload = await fetchJsonWithTimeout(`https://cors.mefi.workers.dev/${reviewUrl}`, 8000, { retries: 1 });
    return normalizeSteamReviewSummary(payload);
  } catch (error) {
    console.warn('Steam reviews failed:', error?.message || error);
    return null;
  }
}

async function findSteamMatchForGame(game) {
  const cacheKey = String(game?.id || game?.name || '');
  if (cacheKey && steamSearchCache.has(cacheKey)) return steamSearchCache.get(cacheKey);

  const searchPromise = (async () => {
    const candidatesById = new Map();
    const queries = buildSteamSearchQueries(game).slice(0, 4);

    for (const query of queries) {
      const searchUrl = buildSteamStoreSearchUrl(query);
      if (!searchUrl) continue;
      try {
        const payload = await fetchJsonWithTimeout(`https://cors.mefi.workers.dev/${searchUrl}`, 6500, { retries: 0 });
        for (const candidate of normalizeSteamSearchPayload(payload)) {
          if (!candidatesById.has(candidate.appId)) candidatesById.set(candidate.appId, candidate);
        }
        const candidates = [...candidatesById.values()];
        const current = selectSteamSearchResult(game, candidates);
        if (current.status === 'match') return current;
      } catch (error) {
        console.warn('Steam search failed:', error?.message || error);
      }
    }

    const candidates = [...candidatesById.values()];
    return selectSteamSearchResult(game, candidates);
  })();

  if (cacheKey) steamSearchCache.set(cacheKey, searchPromise);
  return searchPromise;
}

function renderDetailSteamMatch(container, result) {
  if (!container) return;
  if (!result || result.status === 'none') {
    container.innerHTML = `
      <div class="steam-match-panel steam-match-panel-muted">
        <div>
          <div class="steam-match-title">${esc(t('detail.steamLookup.title'))}</div>
          <div class="steam-match-status">${esc(t('detail.steamLookup.notFound'))}</div>
        </div>
      </div>`;
    return;
  }

  if (result.status === 'match' && result.match) {
    const match = result.match;
    container.innerHTML = `
      <div class="steam-match-panel">
        <div>
          <div class="steam-match-title">${esc(t('detail.steamLookup.title'))}</div>
          <div class="steam-match-status">${esc(t('detail.steamLookup.found'))}</div>
          <div class="steam-match-name">${esc(match.name)}</div>
          <div class="steam-match-meta">App ID ${esc(match.appId)}</div>
        </div>
        <a class="detail-link-btn" href="steamchecker/?appid=${encodeURIComponent(match.appId)}">${esc(t('detail.steamLookup.check'))}</a>
      </div>`;
    return;
  }

  const options = (result.candidates || []).slice(0, 3);
  if (!options.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="steam-match-panel">
      <div>
        <div class="steam-match-title">${esc(t('detail.steamLookup.title'))}</div>
        <div class="steam-match-status">${esc(t('detail.steamLookup.possible'))}</div>
        <div class="steam-match-meta">${esc(t('detail.steamLookup.choose'))}</div>
      </div>
      <div class="steam-match-options">
        ${options.map(candidate => `
          <a class="detail-link-btn" href="steamchecker/?appid=${encodeURIComponent(candidate.appId)}">
            <span>${esc(candidate.name)}</span>
            <span class="steam-match-appid">${esc(candidate.appId)}</span>
          </a>
        `).join('')}
      </div>
    </div>`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

function iconLabel(iconName, label) {
  return `${icon(iconName)}<span>${esc(label)}</span>`;
}

function setCopiedState(button, resetKey = 'detail.share', iconName = 'copy') {
  button.innerHTML = iconLabel('check', t('detail.copied'));
  button.classList.add('copied');
  setTimeout(() => {
    button.innerHTML = iconLabel(iconName, t(resetKey));
    button.classList.remove('copied');
  }, 2000);
}

function renderSteamReviewSummaryCard(summary) {
  const unavailable = !summary;
  const positiveRate = summary?.positivePercent === null || summary?.positivePercent === undefined
    ? ''
    : `<div class="steam-review-rate">${esc(t('steamchecker.positiveRate').replace('{percent}', summary.positivePercent))}</div>`;
  return `
    <article class="rating-card fade-in steam-review-summary-card">
      <div class="rating-card-subtitle rating-card-kicker">${esc(t('steamchecker.recentReviews'))}</div>
      ${unavailable ? `
        <div class="detail-no-descriptors">${esc(t('steamchecker.reviewsUnavailable'))}</div>
      ` : `
        <div class="steam-review-score">${esc(summary.reviewScoreDesc)}</div>
        ${positiveRate}
        <dl class="steam-review-metrics">
          <div>
            <dt>${esc(t('steamchecker.totalReviews'))}</dt>
            <dd>${esc(formatCount(summary.totalReviews))}</dd>
          </div>
          <div>
            <dt>${esc(t('steamchecker.positiveReviews'))}</dt>
            <dd>${esc(formatCount(summary.totalPositive))}</dd>
          </div>
          <div>
            <dt>${esc(t('steamchecker.negativeReviews'))}</dt>
            <dd>${esc(formatCount(summary.totalNegative))}</dd>
          </div>
        </dl>
      `}
    </article>
  `;
}

function currentSearchStateFromDom() {
  return {
    query: document.getElementById('search-input')?.value || '',
    publisher: document.getElementById('publisher-input')?.value || '',
    ratings: new Set(activeRatings),
    platforms: new Set(activePlatforms),
    descriptors: new Set(activeDescriptors),
    years: new Set(activeYears),
    page: currentPage
  };
}

function applySearchStateFromUrl() {
  const state = readSearchState(new URLSearchParams(location.search));
  const searchInput = document.getElementById('search-input');
  const publisherInput = document.getElementById('publisher-input');

  if (searchInput) searchInput.value = state.query;
  if (publisherInput) publisherInput.value = state.publisher;
  activeRatings = state.ratings;
  activePlatforms = state.platforms;
  activeDescriptors = state.descriptors;
  activeYears = state.years;
  currentPage = state.page;
}

function syncSearchUrl() {
  if (!document.getElementById('game-list')) return;
  const params = buildSearchParams(currentSearchStateFromDom());
  const query = params.toString();
  const nextUrl = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
  const currentUrl = `${location.pathname}${location.search}${location.hash}`;
  if (nextUrl !== currentUrl) history.replaceState(history.state, '', nextUrl);
}

function hasActiveSearchState() {
  const state = currentSearchStateFromDom();
  return Boolean(
    String(state.query || '').trim()
    || String(state.publisher || '').trim()
    || state.ratings.size
    || state.platforms.size
    || state.descriptors.size
    || state.years.size
  );
}

function clearAllSearchState(options = {}) {
  const { focusSearch = false } = options;
  const searchInput = document.getElementById('search-input');
  const publisherInput = document.getElementById('publisher-input');

  if (searchInput) searchInput.value = '';
  if (publisherInput) publisherInput.value = '';
  activeRatings.clear();
  activePlatforms.clear();
  activeDescriptors.clear();
  activeYears.clear();
  currentPage = 1;
  renderFilterSidebar();
  renderResults();
  syncSearchUrl();
  if (focusSearch) searchInput?.focus();
}

function buildActiveFilterLabels(query, publisher) {
  const labels = [];
  if (query) labels.push(`${t('search.query')}: ${query}`);
  if (publisher) labels.push(`${t('search.publisherLabel')}: ${publisher}`);
  for (const id of [...activeRatings].sort((a, b) => rweight(a) - rweight(b))) labels.push(`${t('filter.rating')}: ${rname(id)}`);
  for (const id of [...activePlatforms].sort((a, b) => pname(a).localeCompare(pname(b)))) labels.push(`${t('filter.platform')}: ${pname(id)}`);
  for (const id of [...activeDescriptors].sort((a, b) => dname(a).localeCompare(dname(b)))) labels.push(`${t('filter.descriptor')}: ${dname(id)}`);
  for (const year of [...activeYears].sort((a, b) => Number(b) - Number(a))) labels.push(`${t('filter.year')}: ${year}`);
  return labels;
}

function renderActiveFilterSummary(query, publisher) {
  const summary = document.getElementById('active-filter-summary');
  if (!summary) return;

  const labels = buildActiveFilterLabels(query, publisher);
  if (!labels.length) {
    summary.innerHTML = '';
    return;
  }

  summary.innerHTML = `
    <span class="active-filter-label">${esc(t('search.active'))}</span>
    <div class="active-filter-chips">
      ${labels.map(label => `<span>${esc(label)}</span>`).join('')}
    </div>
    <button class="active-filter-clear" id="search-clear-all" type="button">${esc(t('search.clearAll'))}</button>
  `;
  document.getElementById('search-clear-all')?.addEventListener('click', () => clearAllSearchState({ focusSearch: true }));
}

function bindSearchInputKeyboard(input) {
  if (!input) return;
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!input.value) {
        input.blur();
        return;
      }
      input.value = '';
      currentPage = 1;
      renderResults();
      syncSearchUrl();
    }
  });
}

function setCurrentNav() {
  const currentPath = location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.header-actions a[href]').forEach(link => {
    const linkPath = new URL(link.href).pathname.replace(/\/+$/, '') || '/';
    if (linkPath === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function renderCard(game, gq, pq) {
  const rid = ratingIdsFromGame(game)[0] || 7;
  const descriptorIds = descriptorIdsFromGame(game);
  const descriptorPreview = descriptorIds.length
    ? descriptorIds.slice(0, 3).map(id => dname(id)).join(', ') + (descriptorIds.length > 3 ? ', etc.' : '')
    : t('card.noDescriptors');
  const platforms = platformIdsFromGame(game).map(p => pname(p)).join(', ');
  return `
    <article class="game-card fade-in" data-id="${game.id}" tabindex="0" role="button" aria-label="${esc(game.name)}">
      <div class="game-card-top">
        <div class="game-card-info">
          <div class="game-title">${hl(game.name, gq)}</div>
          <div class="game-publisher">${hl(game.publisherName, pq)}</div>
        </div>
        <div class="game-card-right">
          <span class="rating-badge" data-rating="${rid}">${esc(rname(rid))}</span>
          <button class="view-detail" data-id="${game.id}" type="button">${t('card.viewDetail')}</button>
        </div>
      </div>
      <div class="game-card-meta">
        <div class="game-meta-group">
          <span class="game-meta-label">${t('detail.year')}</span>
          <span class="game-meta-value">${game.releaseYear}</span>
        </div>
        <div class="game-meta-group">
          <span class="game-meta-label">${t('detail.platforms')}</span>
          <span class="game-meta-value">${esc(platforms)}</span>
        </div>
        <div class="game-meta-group descriptor-preview">
          <span class="game-meta-label">${t('card.descriptors')}</span>
          <span class="game-meta-value">${esc(descriptorPreview)}</span>
        </div>
      </div>
    </article>`;
}

function renderFilterSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const facets = searchIndex?.facets || { ratingCounts: {}, platformCounts: {}, descriptorCounts: {}, yearCounts: {} };
  const ratingCounts = facets.ratingCounts || {};
  const platformCounts = facets.platformCounts || {};
  const descriptorCounts = facets.descriptorCounts || {};
  const yearCounts = facets.yearCounts || {};

  const topP = ['PC', 'Android', 'iOS', 'PlayStation 5', 'Nintendo Switch 2', 'Nintendo Switch', 'Web Based']
    .map(platformIdFromName)
    .filter(Number.isFinite);
  const allPlatforms = Object.keys(platformCounts).map(Number).filter(Number.isFinite);
  const platforms = [
    ...topP.filter(p => allPlatforms.includes(p)),
    ...allPlatforms.filter(p => !topP.includes(p)).sort((a, b) => pname(a).localeCompare(pname(b)))
  ];
  const descriptorIds = Object.keys(descriptorCounts).map(Number).filter(Number.isFinite).sort((a, b) => dname(a).localeCompare(dname(b)));
  const years = Object.keys(yearCounts).sort((a, b) => Number(b) - Number(a));
  const hasActive = activeRatings.size + activePlatforms.size + activeDescriptors.size + activeYears.size > 0;

  if (!filterStates) {
    const initC = window.innerWidth <= 900;
    filterStates = { r: initC, p: initC, d: initC, y: initC };
  }

  sidebar.innerHTML = `
    <div class="filter-panel${filterStates.r ? ' collapsed' : ''}" id="filter-rating">
      <button class="filter-panel-header" type="button" aria-expanded="${!filterStates.r}" aria-controls="filter-rating-body">
        ${esc(t('filter.rating'))} <span class="toggle-icon" aria-hidden="true">&#9662;</span>
      </button>
      <div class="filter-panel-body" id="filter-rating-body">
        ${RATING_ORDER.filter(id => meta.ratings[id]).map(id => `
          <label class="filter-checkbox">
            <input type="checkbox" data-rating="${id}" ${activeRatings.has(id) ? 'checked' : ''}>
            ${esc(rname(id))}
            <span class="count">${ratingCounts[id] || 0}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="filter-panel${filterStates.p ? ' collapsed' : ''}" id="filter-platform">
      <button class="filter-panel-header" type="button" aria-expanded="${!filterStates.p}" aria-controls="filter-platform-body">
        ${esc(t('filter.platform'))} <span class="toggle-icon" aria-hidden="true">&#9662;</span>
      </button>
      <div class="filter-panel-body" id="filter-platform-body">
        ${platforms.map(p => `
          <label class="filter-checkbox">
            <input type="checkbox" data-platform="${p}" ${activePlatforms.has(p) ? 'checked' : ''}>
            ${esc(pname(p))}
            <span class="count">${platformCounts[p] || 0}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="filter-panel${filterStates.d ? ' collapsed' : ''}" id="filter-descriptor">
      <button class="filter-panel-header" type="button" aria-expanded="${!filterStates.d}" aria-controls="filter-descriptor-body">
        ${esc(t('filter.descriptor'))} <span class="toggle-icon" aria-hidden="true">&#9662;</span>
      </button>
      <div class="filter-panel-body" id="filter-descriptor-body">
        ${descriptorIds.map(id => `
          <label class="filter-checkbox">
            <input type="checkbox" data-descriptor="${id}" ${activeDescriptors.has(id) ? 'checked' : ''}>
            ${esc(dname(id))}
            <span class="count">${descriptorCounts[id] || 0}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="filter-panel${filterStates.y ? ' collapsed' : ''}" id="filter-year">
      <button class="filter-panel-header" type="button" aria-expanded="${!filterStates.y}" aria-controls="filter-year-body">
        ${esc(t('filter.year'))} <span class="toggle-icon" aria-hidden="true">&#9662;</span>
      </button>
      <div class="filter-panel-body" id="filter-year-body">
        ${years.map(year => `
          <label class="filter-checkbox">
            <input type="checkbox" data-year="${year}" ${activeYears.has(String(year)) ? 'checked' : ''}>
            ${esc(String(year))}
            <span class="count">${yearCounts[year] || 0}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <button class="filter-clear-btn${hasActive ? '' : ' hidden'}" id="filter-clear" type="button">${t('filter.clear')}</button>
  `;

  Array.from(sidebar.querySelectorAll('[data-rating]')).forEach(cb => {
    cb.addEventListener('change', () => { toggle(activeRatings, parseInt(cb.dataset.rating)); currentPage = 1; renderFilterSidebar(); renderResults(); syncSearchUrl(); });
  });
  Array.from(sidebar.querySelectorAll('[data-platform]')).forEach(cb => {
    cb.addEventListener('change', () => { toggle(activePlatforms, parseInt(cb.dataset.platform, 10)); currentPage = 1; renderFilterSidebar(); renderResults(); syncSearchUrl(); });
  });
  Array.from(sidebar.querySelectorAll('[data-descriptor]')).forEach(cb => {
    cb.addEventListener('change', () => { toggle(activeDescriptors, parseInt(cb.dataset.descriptor)); currentPage = 1; renderFilterSidebar(); renderResults(); syncSearchUrl(); });
  });
  Array.from(sidebar.querySelectorAll('[data-year]')).forEach(cb => {
    cb.addEventListener('change', () => { toggle(activeYears, cb.dataset.year); currentPage = 1; renderFilterSidebar(); renderResults(); syncSearchUrl(); });
  });
  Array.from(sidebar.querySelectorAll('.filter-panel-header')).forEach((h, i) => {
    const keys = ['r', 'p', 'd', 'y'];
    h.addEventListener('click', () => {
      const key = keys[i];
      filterStates[key] = !filterStates[key];
      h.parentElement.classList.toggle('collapsed');
      h.setAttribute('aria-expanded', String(!filterStates[key]));
    });
  });
  const clearBtn = document.getElementById('filter-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    activeRatings.clear(); activePlatforms.clear(); activeDescriptors.clear(); activeYears.clear();
    currentPage = 1; renderFilterSidebar(); renderResults(); syncSearchUrl();
  });
}

function renderDetailSidebar(game) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const rid = ratingIdsFromGame(game)[0] || 7;
  const descriptors = descriptorIdsFromGame(game);

  sidebar.innerHTML = `
    <div class="detail-sidebar fade-in">
      <div class="detail-sidebar-section">
        <div class="detail-sidebar-label">${t('sidebar.rating')}</div>
        <a href="ratings/" class="rating-icon-link" title="${esc(rtitle(rid))}">
          <img src="${IMG_RATING(rid)}" alt="${esc(rname(rid))}" loading="lazy">
        </a>
      </div>
      <div class="detail-sidebar-section">
        <div class="detail-sidebar-label">${t('sidebar.descriptor')}</div>
        ${descriptors.length > 0 ? `
          <div class="descriptor-icons">
            ${descriptors.map(d => `
              <span class="descriptor-icon">
                <img src="${IMG_DESCRIPTOR(d)}" alt="${esc(dname(d))}" loading="lazy">
                <span class="tooltip">${esc(dname(d))}</span>
              </span>
            `).join('')}
          </div>
        ` : `<span class="detail-no-descriptors">${t('detail.noDescriptors')}</span>`}
      </div>
      <div class="detail-sidebar-section">
        <div class="detail-sidebar-label">${t('sidebar.platform')}</div>
        <div class="platform-tags">
          ${platformIdsFromGame(game).map(p => `<span class="tag">${esc(pname(p))}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderResults() {
  const list = document.getElementById('game-list');
  const stats = document.getElementById('search-stats');
  const pag = document.getElementById('pagination');
  if (!list || !games) return;

  const gq = (document.getElementById('search-input')?.value || '').trim();
  const pq = (document.getElementById('publisher-input')?.value || '').trim();
  const all = searchAndFilter();

  const total = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const requestedPage = currentPage;
  if (currentPage < 1) currentPage = 1;
  if (currentPage > total) currentPage = total;
  if (currentPage !== requestedPage) syncSearchUrl();
  const start = (currentPage - 1) * PER_PAGE;
  const page = all.slice(start, start + PER_PAGE);

  if (all.length === 0) {
    list.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-icon">${icon('gamepad', 'empty-state-svg')}</div>
        <div class="empty-state-title">${esc(t('empty.title'))}</div>
        <div class="empty-state-desc">${esc(t('empty.desc'))}</div>
        ${hasActiveSearchState() ? `<button class="empty-clear-btn" id="empty-clear-search" type="button">${esc(t('search.clearAll'))}</button>` : ''}
      </div>`;
    document.getElementById('empty-clear-search')?.addEventListener('click', () => clearAllSearchState({ focusSearch: true }));
  } else {
    list.innerHTML = page.map(r => renderCard(r.game, gq, pq)).join('');
    list.querySelectorAll('.view-detail').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); showDetail(parseInt(btn.dataset.id)); });
    });
    list.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => showDetail(parseInt(card.dataset.id)));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          showDetail(parseInt(card.dataset.id));
        }
      });
    });
  }

  if (stats) {
    const filtered = activeRatings.size + activePlatforms.size + activeDescriptors.size + activeYears.size > 0 || gq || pq;
    stats.innerHTML = filtered
      ? t('search.stats.filtered').replace('{count}', `<strong>${all.length}</strong>`).replace('{total}', `<strong>${games.length}</strong>`)
      : t('search.stats').replace('{count}', `<strong>${games.length}</strong>`);
  }
  renderActiveFilterSummary(gq, pq);
  if (pag) renderPagination(pag, total);
}

function showDetail(id, options = {}) {
  const { updateHistory = true } = options;
  const game = games.find(g => g.id === id);
  if (!game) return;

  if (updateHistory) {
    lastListScrollY = window.scrollY;
    history.pushState({ detailId: id, listScrollY: lastListScrollY }, '', `${location.pathname}${location.search}#${id}`);
  }

  currentDetailId = id;

  const dp = document.getElementById('detail-page');
  const lv = document.getElementById('list-view');
  const searchSection = document.querySelector('.search-section');

  const appLayout = document.querySelector('.app-layout');

  if (lv) lv.classList.add('hidden');
  if (searchSection) searchSection.style.display = 'none';
  if (appLayout) appLayout.classList.add('detail-active');
  dp.classList.add('active');

  const unlocked = isUnlocked();

  let gridRows = `
    <span class="detail-label">${t('detail.publisher')}</span>
    <span class="detail-value">${esc(game.publisherName)}</span>
    <span class="detail-label">${t('detail.year')}</span>
    <span class="detail-value">${game.releaseYear}</span>
  `;

  if (unlocked) {
    if (game.videoUrl) {
      const videoField = formatExtraField(game.videoUrl);
      gridRows += `
        <span class="detail-label">${t('detail.video')}</span>
        <span class="detail-value">${videoField}</span>
      `;
    }
    if (game.inGameUrl) {
      const ingameField = formatExtraField(game.inGameUrl);
      gridRows += `
        <span class="detail-label">${t('detail.ingame')}</span>
        <span class="detail-value">${ingameField}</span>
      `;
    }
  }

  const detailDescription = stripHtml(game.description) || t('detail.noDesc');

  dp.innerHTML = `
    <button class="detail-back" id="detail-back" type="button">${iconLabel('arrow-left', t('detail.back'))}</button>
    <div class="detail-card fade-in">
      <div class="detail-header">
        <div>
          <div class="detail-title">${esc(game.name)}</div>
          <div class="detail-publisher">${esc(game.publisherName)}</div>
        </div>
      </div>
      <p class="detail-description">${esc(detailDescription)}</p>
      <div class="detail-grid">${gridRows}</div>
      <div class="detail-actions">
        <button class="detail-share-btn" id="detail-share" type="button">${iconLabel('copy', t('detail.share'))}</button>
        <a class="detail-link-btn" href="https://igrs.id/game-detail/${game.id}" target="_blank" rel="noopener">
          <img src="${IMAGE_BASE}/igrs.svg" alt="" aria-hidden="true">
          <span>${t('detail.openIgrs')}</span>
        </a>
        <a class="detail-link-btn" href="https://www.google.com/search?q=${encodeURIComponent(`${game.name} ${t('steamchecker.by')} ${game.publisherName}`)}" target="_blank" rel="noopener">
          ${icon('search')}
          <span>${t('detail.searchGoogle')}</span>
        </a>
      </div>
      <div class="detail-steam-match" id="detail-steam-match" aria-live="polite">
        <div class="steam-match-panel steam-match-panel-muted">
          <div class="loading-spinner"></div>
          <div>
            <div class="steam-match-title">${esc(t('detail.steamLookup.title'))}</div>
            <div class="steam-match-status">${esc(t('detail.steamLookup.loading'))}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderDetailSidebar(game);
  findSteamMatchForGame(game).then(result => {
    if (currentDetailId !== id) return;
    renderDetailSteamMatch(document.getElementById('detail-steam-match'), result);
  }).catch(() => {
    if (currentDetailId !== id) return;
    renderDetailSteamMatch(document.getElementById('detail-steam-match'), { status: 'none' });
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  document.getElementById('detail-back').addEventListener('click', () => {
    if (history.state?.detailId === id) history.back();
    else hideDetail();
  });
  document.getElementById('detail-share').addEventListener('click', async function () {
    const url = `${location.origin}/game/${game.id}`;
    try {
      if (await copyText(url)) setCopiedState(this);
    } catch (error) {
      console.warn('Copy failed:', error?.message || error);
    }
  });
}

function hideDetail(options = {}) {
  const { updateHistory = true } = options;
  const scrollY = lastListScrollY;
  currentDetailId = null;
  if (updateHistory) history.replaceState(null, '', `${location.pathname}${location.search}`);

  const dp = document.getElementById('detail-page');
  const lv = document.getElementById('list-view');
  const searchSection = document.querySelector('.search-section');

  const appLayout = document.querySelector('.app-layout');

  dp.classList.remove('active');
  dp.innerHTML = '';
  if (lv) lv.classList.remove('hidden');
  if (searchSection) searchSection.style.display = '';
  if (appLayout) appLayout.classList.remove('detail-active');

  renderFilterSidebar();
  requestAnimationFrame(() => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousBehavior;
    });
  });
}

function renderPagination(el, total) {
  if (total <= 1) { el.innerHTML = ''; return; }
  let h = `<div class="pagination-status">${esc(t('page.status').replace('{page}', currentPage).replace('{total}', total))}</div>`;
  h += '<div class="pagination-controls">';
  h += `<button class="page-btn" data-p="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} type="button">${icon('chevron-left')}<span>${t('page.prev')}</span></button>`;
  h += '<div class="pagination-center">';
  let jumpInserted = false;
  let skipNextEllipsis = false;
  for (const p of pageRange(currentPage, total)) {
    if (p === '...') {
      if (skipNextEllipsis) {
        skipNextEllipsis = false;
        continue;
      }
      if (!jumpInserted) {
        h += `
          <p class="page-ellipsis">...</p>
          <form class="page-jump" id="page-jump-form">
            <input
              class="page-jump-input"
              id="page-jump-input"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="4"
              value="${currentPage}"
              aria-label="${t('page.jump')}"
            >
          </form>
          <p class="page-ellipsis">...</p>
        `;
        jumpInserted = true;
        skipNextEllipsis = true;
      } else {
        h += '<p class="page-ellipsis">...</p>';
      }
    } else {
      h += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-p="${p}" type="button">${p}</button>`;
    }
  }
  if (!jumpInserted) {
    h += `
      <form class="page-jump" id="page-jump-form">
        <input
          class="page-jump-input"
          id="page-jump-input"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="4"
          value="${currentPage}"
          aria-label="${t('page.jump')}"
        >
      </form>
    `;
  }
  h += '</div>';
  h += `<button class="page-btn" data-p="${currentPage + 1}" ${currentPage === total ? 'disabled' : ''} type="button"><span>${t('page.next')}</span>${icon('chevron-right')}</button>`;
  h += '</div>';
  el.innerHTML = h;
  el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return; currentPage = parseInt(b.dataset.p); renderResults();
    syncSearchUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  const jumpForm = el.querySelector('#page-jump-form');
  const jumpInput = el.querySelector('#page-jump-input');
  if (jumpForm && jumpInput) {
    jumpForm.addEventListener('submit', event => {
      event.preventDefault();
      const value = parseInt(jumpInput.value, 10);
      if (!Number.isFinite(value)) return;
      const nextPage = Math.min(total, Math.max(1, value));
      if (nextPage === currentPage) return;
      currentPage = nextPage;
      renderResults();
      syncSearchUrl();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    jumpInput.addEventListener('input', () => {
      jumpInput.value = jumpInput.value.replace(/\D+/g, '');
    });
    jumpInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') jumpInput.blur();
    });
  }
}

function pageRange(c, t) {
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  const p = [1];
  if (c > 3) p.push('...');
  for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) p.push(i);
  if (c < t - 2) p.push('...');
  p.push(t);
  return p;
}

function handleHash() {
  const m = location.hash.match(/^#(\d+)$/);
  if (!m) {
    if (currentDetailId !== null) hideDetail({ updateHistory: false });
    return;
  }
  const id = parseInt(m[1]);
  if (games && games.find(g => g.id === id)) showDetail(id, { updateHistory: false });
}

function renderRatingsPage() {
  const list = document.getElementById('ratings-list');
  const dg = document.getElementById('descriptor-grid');
  if (!list || !meta) return;

  list.innerHTML = RATING_ORDER.filter(id => meta.ratings[id]).map(id => {
    const r = meta.ratings[id];
    const title = lang === 'id' ? r.titleId : r.titleEn;
    const sub = lang === 'id' ? r.titleEn : r.titleId;
    const content = lang === 'id' ? r.contentId : r.contentEn;
    const guide = getRatingGuideCopy(id, lang);
    return `
      <article class="rating-card rating-guide-card fade-in" aria-labelledby="rating-guide-title-${id}">
        <div class="rating-card-header">
          <img src="${IMG_RATING(id)}" alt="${esc(r.name)}" loading="lazy">
          <div>
            <div class="rating-card-title" id="rating-guide-title-${id}">${esc(title)}</div>
            <div class="rating-card-subtitle">${esc(sub)}</div>
          </div>
        </div>
        <p class="rating-summary">${esc(guide.summary || content)}</p>
        <dl class="rating-guide-list">
          ${guide.sections.map(section => `
            <div class="rating-guide-item">
              <dt>${esc(section.label)}</dt>
              <dd>${esc(section.text)}</dd>
            </div>
          `).join('')}
        </dl>
        ${guide.watchFor.length ? `
          <div class="rating-watch-row" aria-label="${esc(t('ratings.watchFor'))}">
            <span>${esc(t('ratings.watchFor'))}</span>
            <div class="rating-watch-tags">
              ${guide.watchFor.map(item => `<span>${esc(item)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <details class="rating-official">
          <summary>${esc(t('ratings.officialCriteria'))}</summary>
          <div class="rating-content">${esc(content)}</div>
          <div class="rating-source">
            <span>${esc(t('ratings.source'))}:</span>
            ${safeExternalLink(OFFICIAL_RATING_INFO_URL, 'igrs.id/rating-info')}
          </div>
        </details>
      </article>`;
  }).join('');

  if (dg) {
    dg.innerHTML = Object.entries(meta.descriptors)
      .sort((a, b) => (lang === 'id' ? a[1].nameId : a[1].nameEn).localeCompare(lang === 'id' ? b[1].nameId : b[1].nameEn))
      .map(([id, d]) => {
        const nm = lang === 'id' ? d.nameId : d.nameEn;
        const alt = lang === 'id' ? d.nameEn : d.nameId;
        const numericId = Number(id);
        const guide = getDescriptorGuideCopy(numericId, lang);
        const desc = d.description || '';
        return `
          <article class="descriptor-card descriptor-guide-card fade-in" aria-labelledby="descriptor-guide-title-${id}">
            <img src="${IMG_DESCRIPTOR(id)}" alt="${esc(nm)}" loading="lazy">
            <div class="descriptor-card-text">
              <div class="descriptor-name" id="descriptor-guide-title-${id}">${esc(nm)}</div>
              <div class="descriptor-alt">${esc(alt)}</div>
              <p class="descriptor-summary">${esc(guide.summary || desc || t('descriptors.noGuide'))}</p>
              ${guide.watchFor.length ? `
                <div class="descriptor-review-line" aria-label="${esc(t('descriptors.watchFor'))}">
                  <span class="descriptor-review-label">${esc(t('descriptors.watchFor'))}:</span>
                  <span class="descriptor-review-items">${renderReviewTokens(guide.watchFor)}</span>
                </div>
              ` : ''}
            </div>
          </article>`;
      }).join('');
  }
}

function renderSteamCheckerPage() {
  const form = document.getElementById('steam-checker-form');
  const input = document.getElementById('steam-appid-input');
  const status = document.getElementById('steam-checker-status');
  const results = document.getElementById('steam-checker-results');
  const sidebar = document.getElementById('steam-checker-sidebar');
  if (!form || !input || !status || !results || !sidebar) return;

  const params = new URLSearchParams(location.search);
  const initialAppId = params.get('appid') || '';
  if (initialAppId) input.value = parseSteamAppId(initialAppId) || initialAppId;

  function showIdle() {
    status.textContent = t('steamchecker.empty');
    results.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-title">${esc(t('steamchecker.title'))}</div>
        <div class="empty-state-desc">${esc(t('steamchecker.subtitle'))}</div>
      </div>`;
    sidebar.innerHTML = '';
  }

  function renderError(message) {
    status.textContent = message;
    results.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-title">${esc(message)}</div>
        <div class="empty-state-desc">${esc(t('steamchecker.error.load'))}</div>
      </div>`;
    sidebar.innerHTML = '';
  }

  function renderSteamCheckerResult(appId, steamGame, steamReviewSummary = null) {
    const unlocked = isUnlocked();
    const steamRating = steamGame?.ratings?.igrs || null;
    const generated = parseSteamRatingFlag(steamRating?.rating_generated);
    const localMatch = generated ? findGameByName(steamGame?.name) : null;
    const checker = computeSteamChecker(steamGame);
    const referenceRatingId = localMatch?.ratings?.[0] || null;
    const referenceIsLocal = Boolean(localMatch);
    const steamRatingId = steamRatingToIgrsId(steamRating);
    const referenceDescriptorIds = localMatch?.descriptors || [];
    const steamRatingDescriptorIds = steamIgrsDescriptorIdsFromText(steamRating?.descriptors || '');

    const referenceCard = referenceIsLocal
      ? `
        <div class="rating-card-header">
          ${renderRatingBadge(referenceRatingId)}
          <div>
            <div class="rating-card-title">${esc(rtitle(referenceRatingId))}</div>
            <div class="rating-card-subtitle">${esc(t('steamchecker.reference'))}</div>
          </div>
        </div>
        ${renderDescriptorIcons(referenceDescriptorIds)}
      `
      : `
        <div class="detail-no-descriptors">${esc(t('steamchecker.noLocalRating'))}</div>
      `;

    const steamCard = `
      <div class="rating-card-header">
        ${renderRatingBadge(steamRatingId)}
        <div>
          <div class="rating-card-title">${esc(steamRatingId ? rtitle(steamRatingId) : t('steamchecker.noSteamRating'))}</div>
          <div class="rating-card-subtitle">${esc(generated ? t('steamchecker.generated') : t('steamchecker.noMatch'))}</div>
        </div>
      </div>
      ${renderDescriptorIcons(steamRatingDescriptorIds, 'steamchecker.noDescriptors')}
    `;

    const oursCard = `
      <div class="rating-card-header">
        ${renderRatingBadge(checker.computedRatingId)}
        <div>
          <div class="rating-card-title">${esc(rtitle(checker.computedRatingId))}</div>
          <div class="rating-card-subtitle">${esc(t('steamchecker.manual'))}</div>
        </div>
      </div>
      ${renderDescriptorIcons(checker.mappedDescriptorIds, 'steamchecker.noManualMapping')}
    `;

    const authorName = steamGame?.developers?.[0] || steamGame?.publishers?.[0] || t('steamchecker.unknown');
    const descriptionRaw = steamGame?.detailed_description || steamGame?.about_the_game || '';
    const gameDescription = stripHtml(descriptionRaw) || t('detail.noDesc');

    const steamStorageUrl = `https://store.steampowered.com/app/${appId}`;
    const steamCheckerUrl = location.href.split('?')[0] + `?appid=${appId}`;
    const supportUrl = safeHttpUrl(steamGame?.support_info?.url || '');
    const releaseDate = steamGame?.release_date?.date || null;

    results.innerHTML = `
      <section class="detail-card fade-in steam-result-card">
        <div class="detail-header steam-result-header">
          <div class="steam-result-title-block">
            <div class="detail-title">${esc(steamGame?.name || t('steamchecker.unknown'))}</div>
            <div class="detail-publisher">${esc(authorName)}</div>
          </div>
          <div class="steam-result-header-actions">
            <a class="detail-link-btn steam-result-store-btn" href="${steamStorageUrl}" target="_blank" rel="noopener">
              ${iconLabel('external-link', t('steamchecker.goToStore'))}
            </a>
          </div>
        </div>
        <div class="steam-result-description-shell">
          ${renderSteamDescription(gameDescription)}
        </div>
      </section>
    `;

    const infoSection = `
      <div class="steam-checker-meta">
        ${releaseDate ? `<div class="steam-checker-meta-row"><strong>${esc(t('steamchecker.release'))}:</strong> ${esc(releaseDate)}</div>` : ''}
        ${supportUrl ? `<div class="steam-checker-meta-row"><strong>${esc(t('steamchecker.support'))}:</strong> <a class="steam-checker-support-link" href="${esc(supportUrl.href)}" target="_blank" rel="noopener">${esc(supportUrl.hostname)}</a></div>` : ''}
      </div>
      <div class="detail-actions steam-actions">
        <button class="detail-share-btn steam-share-btn" data-share-url="${steamCheckerUrl}" type="button">${iconLabel('copy', t('detail.share'))}</button>
        <a class="detail-link-btn" href="${steamStorageUrl}" target="_blank" rel="noopener">
          <span>${t('steamchecker.viewSteam')}</span>
        </a>
        <a class="detail-link-btn" href="https://igrs.id/game-detail/${appId}" target="_blank" rel="noopener">
          <img src="${IMAGE_BASE}/igrs.svg" alt="" aria-hidden="true">
          <span>${t('detail.openIgrs')}</span>
        </a>
      </div>
    `;

    sidebar.innerHTML = `
      <article class="rating-card fade-in">
        <div class="rating-card-subtitle rating-card-kicker">${esc(t('steamchecker.reference'))}</div>
        ${referenceCard}
      </article>
      <article class="rating-card fade-in">
        <div class="rating-card-subtitle rating-card-kicker">${esc(t('steamchecker.steam'))}</div>
        ${steamCard}
      </article>
      ${renderSteamReviewSummaryCard(steamReviewSummary)}
      <article class="rating-card fade-in">
        ${infoSection}
      </article>
      ${unlocked ? `
      <article class="rating-card fade-in">
        <div class="rating-card-subtitle rating-card-kicker">${esc(t('steamchecker.ours'))}</div>
        ${oursCard}
      </article>
      ` : ''}
    `;

    document.querySelector('.steam-share-btn')?.addEventListener('click', async function () {
      const url = this.dataset.shareUrl;
      try {
        if (await copyText(url)) setCopiedState(this);
      } catch (error) {
        console.warn('Copy failed:', error?.message || error);
      }
    });

    status.textContent = generated && localMatch ? "" : "";
  }

  async function submitCheck(appId) {
    const trimmed = parseSteamAppId(appId);
    if (!/^\d+$/.test(trimmed)) {
      renderError(t('steamchecker.error.invalid'));
      return;
    }

    input.value = trimmed;

    status.textContent = t('steamchecker.loading');
    results.innerHTML = `
      <div class="empty-state fade-in">
        <div class="loading-spinner"></div>
        <div class="empty-state-title">${esc(t('steamchecker.loading'))}</div>
        <div class="empty-state-desc">${esc(trimmed)}</div>
      </div>`;
    sidebar.innerHTML = '';

    try {
      const [payload, steamReviewSummary] = await Promise.all([
        fetchJsonWithTimeout(`https://cors.mefi.workers.dev/https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(trimmed)}`),
        fetchSteamReviewSummary(trimmed)
      ]);
      const steamGame = payload?.[trimmed];
      if (!steamGame?.success || !steamGame.data) {
        throw new Error(t('steamchecker.error.notfound'));
      }
      history.replaceState(null, '', `/steamchecker/?appid=${encodeURIComponent(trimmed)}`);
      renderSteamCheckerResult(trimmed, steamGame.data, steamReviewSummary);
    } catch (error) {
      renderError(error?.name === 'AbortError' ? t('steamchecker.error.load') : (error?.message || t('steamchecker.error.load')));
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    submitCheck(input.value);
  });

  if (initialAppId) submitCheck(initialAppId);
  else showIdle();
}

function renderHomePage() {
  if (!games || !meta) return;
  const gameList = Array.isArray(games) ? games : [];

  const statGames = document.getElementById('stat-games');
  const statPub = document.getElementById('stat-publishers');
  const statPlat = document.getElementById('stat-platforms');
  const statUpdated = document.getElementById('stat-updated');
  const heroRatings = document.getElementById('hero-ratings');

  if (statGames) statGames.textContent = gameList.length;
  if (statPub) statPub.textContent = new Set(gameList.map(g => g.publisherName)).size;
  if (statPlat) statPlat.textContent = new Set(gameList.flatMap(g => platformIdsFromGame(g))).size;
  if (statUpdated) statUpdated.textContent = formatLocalDateTime24(meta?.meta?.generatedAt || meta?.generatedAt);

  if (heroRatings) {
    heroRatings.innerHTML = RATING_ORDER.filter(id => meta.ratings[id]).map(id =>
      `<a href="ratings/" title="${esc(rtitle(id))}"><img src="${IMG_RATING(id)}" alt="${esc(rname(id))}" loading="lazy"></a>`
    ).join('');
  }
}

function applyFooterYear() {
  const year = String(new Date().getUTCFullYear());
  document.querySelectorAll('[data-current-year]').forEach(el => {
    el.textContent = year;
  });
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.dataset.i18n);
    if (val.includes('<br>') || val.includes('<')) el.innerHTML = val;
    else el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
  const ll = document.getElementById('lang-label');
  if (ll) ll.textContent = lang === 'en' ? 'ID' : 'EN';
  document.documentElement.lang = lang;
  document.body.classList.add('ready');
  applyFooterYear();
}

function initScrollTop() {
  const b = document.getElementById('scroll-top');
  if (!b) return;
  window.addEventListener('scroll', () => b.classList.toggle('visible', window.scrollY > 400), { passive: true });
  b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

async function init() {
  const isSearch = !!document.getElementById('game-list');
  const isRatings = !!document.getElementById('ratings-list');
  const isHome = !!document.getElementById('hero-stats');
  const isSteamChecker = !!document.getElementById('steam-checker-page');
  const needsData = isSearch || isRatings || isHome || isSteamChecker;

  applyI18n();
  setCurrentNav();
  initScrollTop();

  const renderInitialView = () => {
    if (isHome) {
      renderHomePage();
    } else if (isRatings) {
      renderRatingsPage();
    } else if (isSteamChecker) {
      renderSteamCheckerPage();
    } else if (isSearch) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      applySearchStateFromUrl();
      renderFilterSidebar();
      renderResults();
      syncSearchUrl();
      const dr = debounce(() => { currentPage = 1; renderResults(); syncSearchUrl(); }, 120);
      const searchInput = document.getElementById('search-input');
      const publisherInput = document.getElementById('publisher-input');
      searchInput?.addEventListener('input', dr);
      publisherInput?.addEventListener('input', dr);
      bindSearchInputKeyboard(searchInput);
      bindSearchInputKeyboard(publisherInput);
      handleHash();
      window.addEventListener('hashchange', handleHash);
      window.addEventListener('popstate', () => {
        applySearchStateFromUrl();
        renderFilterSidebar();
        renderResults();
        if (!location.hash && currentDetailId !== null) hideDetail({ updateHistory: false });
        else handleHash();
      });
    }
  };

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    lang = lang === 'en' ? 'id' : 'en';
    localStorage.setItem('igrs-lang', lang);
    checkUnlock();
    applyI18n();
    if (!needsData || !games || !meta) return;
    if (isHome) { renderHomePage(); }
    else if (isRatings) { renderRatingsPage(); }
    else if (isSteamChecker) { renderSteamCheckerPage(); }
    else if (isSearch) {
      if (currentDetailId !== null) showDetail(currentDetailId, { updateHistory: false });
      else { renderFilterSidebar(); renderResults(); }
    }
  });

  if (!needsData) return;

  try { await loadData(); } catch (e) {
    console.error('Load failed:', { code: e?.code || 'DATA_UNKNOWN', message: e?.message || String(e) });
    const el = document.getElementById('game-list') || document.getElementById('ratings-list');
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${icon('alert-triangle', 'empty-state-svg')}</div><div class="empty-state-title">${esc(t('data.error.title'))}</div><div class="empty-state-desc">${esc(t('data.error.desc'))}</div></div>`;
    return;
  }

  renderInitialView();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
