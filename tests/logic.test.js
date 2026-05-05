#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadModule(relativePath, names) {
  const source = read(relativePath)
    .replace(/\bexport\s+function\s+/g, 'function ')
    .replace(/\bexport\s+const\s+/g, 'const ')
    .replace(/\bexport\s+class\s+/g, 'class ');
  const returns = names.map(name => `${name}: ${name}`).join(', ');
  return Function(`"use strict";\n${source}\nreturn { ${returns} };`)();
}

function testSafeRenderHelpersRejectUnsafeLinksAndEscapeLabels() {
  const { esc, safeHttpUrl, safeExternalLink } = loadModule('src/core/safe-render.js', [
    'esc',
    'safeHttpUrl',
    'safeExternalLink'
  ]);

  assert(esc('<img src=x onerror=1> & "x"') === '&lt;img src=x onerror=1&gt; &amp; &quot;x&quot;', 'esc: expected HTML entity escaping');
  assert(safeHttpUrl('javascript:alert(1)') === null, 'safeHttpUrl: expected javascript URLs to be rejected');
  assert(safeHttpUrl('ftp://example.com/file') === null, 'safeHttpUrl: expected non-http URLs to be rejected');
  assert(safeHttpUrl('https://example.com/a b').href === 'https://example.com/a%20b', 'safeHttpUrl: expected valid HTTPS URL');
  assert(safeExternalLink('javascript:alert(1)', '<b>bad</b>') === '', 'safeExternalLink: expected unsafe link to render empty');

  const link = safeExternalLink('https://example.com/path?q=1', '<Open>');
  assert(link.includes('href="https://example.com/path?q=1"'), 'safeExternalLink: expected escaped href');
  assert(link.includes('rel="noopener noreferrer"'), 'safeExternalLink: expected no opener policy');
  assert(link.includes('&lt;Open&gt;'), 'safeExternalLink: expected escaped label');
}

function testDataContractsGiveStableCodesAndFallbacks() {
  const {
    assertGamesPayload,
    assertMetaPayload,
    normalizeExtraPayload,
    normalizeSteamMetaPayload
  } = loadModule('src/core/data-contracts.js', [
    'assertGamesPayload',
    'assertMetaPayload',
    'normalizeExtraPayload',
    'normalizeSteamMetaPayload'
  ]);

  const goodMeta = {
    ratings: { 7: { name: 'SU' } },
    descriptors: { 1: { nameEn: 'Violence' } },
    platforms: { 1: 'PC' }
  };
  assert(assertMetaPayload(goodMeta) === goodMeta, 'assertMetaPayload: expected valid meta to pass through');

  const goodGames = [{ id: 1, name: 'Game', publisherName: 'Publisher', releaseYear: 2026, ratings: [7] }];
  assert(assertGamesPayload(goodGames) === goodGames, 'assertGamesPayload: expected valid game list to pass through');

  let error = null;
  try {
    assertGamesPayload([{ id: '1', name: 'Broken' }]);
  } catch (err) {
    error = err;
  }
  assert(error?.code === 'DATA_INVALID_GAMES', 'assertGamesPayload: expected stable error code');
  assert(error?.userMessage && !error.userMessage.includes('Broken'), 'assertGamesPayload: expected user-safe message');

  const steamFallback = normalizeSteamMetaPayload(null);
  assert(steamFallback.contentDescriptors && Object.keys(steamFallback.contentDescriptors).length === 0, 'normalizeSteamMetaPayload: expected safe fallback');

  const extra = normalizeExtraPayload({ games: [{ id: 1, videoUrl: 'https://example.com' }] });
  assert(Array.isArray(extra.games) && extra.games.length === 1, 'normalizeExtraPayload: expected games wrapper');
  assert(normalizeExtraPayload(null) === null, 'normalizeExtraPayload: expected null fallback');
}

function testSearchIndexPrecomputesFacetsAndFiltersByRelevance() {
  const {
    createGameSearchIndex,
    filterIndexedGames,
    fuzzyScoreNormalized,
    normalizeSearchText
  } = loadModule('src/core/search-index.js', [
    'createGameSearchIndex',
    'filterIndexedGames',
    'fuzzyScoreNormalized',
    'normalizeSearchText'
  ]);

  const games = [
    { id: 1, name: 'Astral Hunter', publisherName: 'Red Studio', releaseYear: 2026, ratings: [7], platforms: [1], descriptors: [3] },
    { id: 2, name: 'Metro Puzzle', publisherName: 'Blue Studio', releaseYear: 2024, ratings: [6], platforms: [2], descriptors: [4] },
    { id: 3, name: 'Hunter Academy', publisherName: 'Red Studio', releaseYear: 2026, ratings: [5], platforms: [1, 2], descriptors: [3, 4] }
  ];
  const index = createGameSearchIndex(games, {
    getRatingIds: game => game.ratings,
    getDescriptorIds: game => game.descriptors,
    getPlatformIds: game => game.platforms
  });

  assert(index.items[0].nameNorm === 'astral hunter', 'createGameSearchIndex: expected normalized name');
  assert(index.facets.ratingCounts[7] === 1, 'createGameSearchIndex: expected rating count');
  assert(index.facets.platformCounts[1] === 2, 'createGameSearchIndex: expected platform count');
  assert(index.facets.descriptorCounts[3] === 2, 'createGameSearchIndex: expected descriptor count');
  assert(index.facets.yearCounts[2026] === 2, 'createGameSearchIndex: expected year count');

  const results = filterIndexedGames(index.items, {
    query: 'astr hunt',
    publisher: 'red',
    ratings: new Set([7, 5]),
    platforms: new Set([1]),
    descriptors: new Set([3]),
    years: new Set(['2026'])
  }, fuzzyScoreNormalized);

  assert(results.length === 2, 'filterIndexedGames: expected two matching games');
  assert(results[0].game.id === 1, 'filterIndexedGames: expected strongest fuzzy match first');
  assert(normalizeSearchText('  Astral: Hunter!! ') === 'astral hunter', 'normalizeSearchText: expected stable tokenization');
}

function testUrlStateRoundTripAndSanitizesInput() {
  const { buildSearchParams, readSearchState } = loadModule('src/core/url-state.js', [
    'buildSearchParams',
    'readSearchState'
  ]);

  const state = readSearchState(new URLSearchParams('q=%20Zelda%20&publisher=Nintendo&rating=7,x,6&platform=1&descriptor=2,NaN&year=2025,abcd&page=3'));
  assert(state.query === 'Zelda', 'readSearchState: expected trimmed query');
  assert(state.publisher === 'Nintendo', 'readSearchState: expected publisher');
  assert([...state.ratings].join(',') === '7,6', 'readSearchState: expected invalid rating removed');
  assert([...state.platforms].join(',') === '1', 'readSearchState: expected platform set');
  assert([...state.descriptors].join(',') === '2', 'readSearchState: expected descriptor set');
  assert([...state.years].join(',') === '2025', 'readSearchState: expected numeric year set');
  assert(state.page === 3, 'readSearchState: expected page');
  assert(readSearchState(new URLSearchParams('page=-5')).page === 1, 'readSearchState: expected page floor');

  const params = buildSearchParams({
    query: 'Mario',
    publisher: '',
    ratings: new Set([6, 7]),
    platforms: new Set([1]),
    descriptors: new Set(),
    years: new Set(['2026']),
    page: 2
  });
  assert(String(params) === 'q=Mario&rating=6%2C7&platform=1&year=2026&page=2', 'buildSearchParams: expected compact deterministic params');
}

function testUrlStateRejectsNonIntegerFacetIds() {
  const { buildSearchParams, readSearchState } = loadModule('src/core/url-state.js', [
    'buildSearchParams',
    'readSearchState'
  ]);

  const state = readSearchState(new URLSearchParams('rating=7,-1,1.5,0&platform=2.2,3&descriptor=4,NaN,5.5'));
  assert([...state.ratings].join(',') === '7', 'readSearchState: expected non-positive and decimal ratings removed');
  assert([...state.platforms].join(',') === '3', 'readSearchState: expected decimal platforms removed');
  assert([...state.descriptors].join(',') === '4', 'readSearchState: expected decimal descriptors removed');

  const params = buildSearchParams({
    ratings: new Set([7, -1, 1.5]),
    platforms: new Set([3, 2.2]),
    descriptors: new Set([4, 5.5]),
    years: new Set(['2026', 'abcd']),
    page: 1
  });
  assert(String(params) === 'rating=7&platform=3&descriptor=4&year=2026', 'buildSearchParams: expected invalid facet values omitted');
}

function testRatingGuideCopyIsInformativeCompactStructuredAndLocalized() {
  const { getRatingGuideCopy } = loadModule('src/core/rating-guide.js', [
    'getRatingGuideCopy'
  ]);

  const english = getRatingGuideCopy(7, 'en');
  assert(english.summary.length >= 80 && english.summary.length <= 260, 'getRatingGuideCopy: expected informative compact English summary');
  assert(english.sections.length >= 3, 'getRatingGuideCopy: expected several structured English sections');
  assert(english.sections.every(section => section.label && section.text.length >= 24 && section.text.length <= 180), 'getRatingGuideCopy: expected compact but useful section text');
  assert(english.watchFor.length >= 6, 'getRatingGuideCopy: expected broader English watch-for chips');
  assert(!english.summary.includes('does not display references'), 'getRatingGuideCopy: expected plain-language rewrite');

  const indonesian = getRatingGuideCopy(6, 'id');
  assert(indonesian.summary.length >= 80 && indonesian.summary.length <= 280, 'getRatingGuideCopy: expected informative compact Indonesian summary');
  assert(indonesian.sections.some(section => section.text.toLowerCase().includes('dewasa')), 'getRatingGuideCopy: expected localized Indonesian content');
  assert(indonesian.watchFor.length >= 6, 'getRatingGuideCopy: expected broader Indonesian watch-for chips');
  for (const ratingId of [7, 4, 5, 28, 6, 35]) {
    assert(getRatingGuideCopy(ratingId, 'en').watchFor.length >= 6, `getRatingGuideCopy: expected rating ${ratingId} to have broader English watch-for cues`);
    assert(getRatingGuideCopy(ratingId, 'id').watchFor.length >= 6, `getRatingGuideCopy: expected rating ${ratingId} to have broader Indonesian watch-for cues`);
  }
  assert(getRatingGuideCopy(999, 'en').summary === '', 'getRatingGuideCopy: expected safe fallback for unknown rating');
}

function testDescriptorGuideCopyIsInformativeCompactStructuredAndLocalized() {
  const { getDescriptorGuideCopy } = loadModule('src/core/descriptor-guide.js', [
    'getDescriptorGuideCopy'
  ]);

  const online = getDescriptorGuideCopy(10, 'en');
  assert(online.summary.length >= 70 && online.summary.length <= 260, 'getDescriptorGuideCopy: expected informative compact English summary');
  assert(online.sections.length >= 3, 'getDescriptorGuideCopy: expected several structured English sections');
  assert(online.sections.every(section => section.label && section.text.length >= 24 && section.text.length <= 180), 'getDescriptorGuideCopy: expected compact but useful section text');
  assert(online.watchFor.length >= 3, 'getDescriptorGuideCopy: expected English watch-for chips');

  const gambling = getDescriptorGuideCopy(15, 'id');
  assert(gambling.summary.length >= 70 && gambling.summary.length <= 280, 'getDescriptorGuideCopy: expected informative compact Indonesian summary');
  assert(gambling.sections.some(section => section.text.toLowerCase().includes('judi')), 'getDescriptorGuideCopy: expected localized Indonesian content');
  assert(getDescriptorGuideCopy(999, 'en').summary === '', 'getDescriptorGuideCopy: expected safe fallback for unknown descriptor');
}

function testSteamDescriptionFormatterBuildsReadableSectionsAndEscapesHtml() {
  const { renderSteamDescription } = loadModule('src/core/steam-description.js', [
    'renderSteamDescription'
  ]);

  const html = renderSteamDescription([
    'Start Small. Command Everything.',
    'Your journey begins with a single ship - but what you become is up to you.',
    'Build Your Empire',
    'Construct space stations, establish trade networks, and control production chains.',
    'Design and expand your infrastructure using a modular system.',
    'Fight and Command',
    '* Engage in real-time combat.',
    '* Command entire fleets strategically.',
    '<script>alert(1)</script>'
  ].join('\n'));

  assert(html.includes('class="steam-description"'), 'renderSteamDescription: expected description wrapper');
  assert(html.includes('class="steam-description-intro"'), 'renderSteamDescription: expected intro block');
  assert(html.includes('<h3>Build Your Empire</h3>'), 'renderSteamDescription: expected detected section heading');
  assert(html.includes('<ul class="steam-description-list">'), 'renderSteamDescription: expected bullet list for short feature lines');
  assert(html.includes('<li>Engage in real-time combat.</li>'), 'renderSteamDescription: expected explicit bullet item');
  assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'renderSteamDescription: expected escaped HTML');
  assert(!html.includes('<script>'), 'renderSteamDescription: should not render executable HTML');
}

function testSteamDescriptionFormatterKeepsSteamListBlocksTogether() {
  const { renderSteamDescription } = loadModule('src/core/steam-description.js', [
    'renderSteamDescription'
  ]);

  const html = renderSteamDescription([
    'Bongo cat needs your help. Bongo cat needz more hatz!!! Every time you press a key, Bongo cat will punch your taskbar.',
    'Item drop pool chances*:',
    'Common - 90%',
    'Uncommon - 9.5%',
    'Rare - 0.49%',
    'Epic - 0.01%',
    'Legendary - 1 in 500000',
    '*Subject to change',
    'Features:',
    'Your own bongo cat',
    'Many customization options',
    'A friend while working hard',
    'Based on the artwork and meme of @StrayRogue'
  ].join('\n'));

  assert(html.includes('<h3>Item drop pool chances*</h3>'), 'renderSteamDescription: expected colon heading without colon');
  assert(!html.includes('<h3>Uncommon - 9.5%</h3>'), 'renderSteamDescription: list value should not become a heading');
  assert(html.includes('<li>Common - 90%</li><li>Uncommon - 9.5%</li><li>Rare - 0.49%</li><li>Epic - 0.01%</li><li>Legendary - 1 in 500000</li><li>Subject to change</li>'), 'renderSteamDescription: expected drop rates to remain one list block');
  assert(html.includes('<h3>Features</h3>'), 'renderSteamDescription: expected features heading');
  assert(html.includes('<li>Your own bongo cat</li><li>Many customization options</li><li>A friend while working hard</li><li>Based on the artwork and meme of @StrayRogue</li>'), 'renderSteamDescription: expected feature lines to remain one list block');
}

function testSteamReviewSummaryNormalizesAggregateReviewData() {
  const { buildSteamReviewsUrl, normalizeSteamReviewSummary } = loadModule('src/core/steam-reviews.js', [
    'buildSteamReviewsUrl',
    'normalizeSteamReviewSummary'
  ]);

  const url = buildSteamReviewsUrl('392160');
  assert(url === 'https://store.steampowered.com/appreviews/392160?json=1&filter=recent&language=all&review_type=all&purchase_type=all&num_per_page=1', 'buildSteamReviewsUrl: expected capped recent reviews summary URL');

  const summary = normalizeSteamReviewSummary({
    success: 1,
    query_summary: {
      num_reviews: 1,
      review_score: 8,
      review_score_desc: 'Very Positive',
      total_positive: 12543,
      total_negative: 1200,
      total_reviews: 13743
    }
  });

  assert(summary.reviewScore === 8, 'normalizeSteamReviewSummary: expected review score');
  assert(summary.reviewScoreDesc === 'Very Positive', 'normalizeSteamReviewSummary: expected review score label');
  assert(summary.totalReviews === 13743, 'normalizeSteamReviewSummary: expected total reviews');
  assert(summary.totalPositive === 12543, 'normalizeSteamReviewSummary: expected positive total');
  assert(summary.totalNegative === 1200, 'normalizeSteamReviewSummary: expected negative total');
  assert(summary.positivePercent === 91, 'normalizeSteamReviewSummary: expected rounded positive percentage');
  assert(normalizeSteamReviewSummary({ success: 0 }) === null, 'normalizeSteamReviewSummary: expected failed payload fallback');
  assert(normalizeSteamReviewSummary({ success: 1, query_summary: {} }) === null, 'normalizeSteamReviewSummary: expected empty payload fallback');
}

function testSteamReviewSummaryRejectsInvalidAppIdsAndClampsPercentages() {
  const { buildSteamReviewsUrl, normalizeSteamReviewSummary } = loadModule('src/core/steam-reviews.js', [
    'buildSteamReviewsUrl',
    'normalizeSteamReviewSummary'
  ]);

  assert(buildSteamReviewsUrl('abc') === null, 'buildSteamReviewsUrl: expected non-numeric app ID to be rejected');
  assert(buildSteamReviewsUrl('12x34') === null, 'buildSteamReviewsUrl: expected mixed app ID to be rejected');

  const summary = normalizeSteamReviewSummary({
    success: 1,
    query_summary: {
      review_score_desc: 'Mostly Positive',
      total_positive: 12,
      total_negative: 1,
      total_reviews: 10
    }
  });
  assert(summary.positivePercent === 100, 'normalizeSteamReviewSummary: expected positive percentage to be capped');
}

function testSteamSearchQueriesNormalizeEditionTitles() {
  const { buildSteamSearchQueries, buildSteamStoreSearchUrl } = loadModule('src/core/steam-search.js', [
    'buildSteamSearchQueries',
    'buildSteamStoreSearchUrl'
  ]);

  const queries = buildSteamSearchQueries({
    name: 'Tales of ARISE - Beyond the Dawn Edition'
  });

  assert(queries[0] === 'tales of arise beyond the dawn edition', 'buildSteamSearchQueries: expected exact normalized title first');
  assert(queries.includes('tales of arise beyond the dawn'), 'buildSteamSearchQueries: expected commercial suffix to be removed');
  assert(queries.includes('tales of arise'), 'buildSteamSearchQueries: expected base title fallback');
  assert(new Set(queries).size === queries.length, 'buildSteamSearchQueries: expected duplicate queries removed');

  const url = buildSteamStoreSearchUrl('tales of arise beyond the dawn');
  assert(url === 'https://store.steampowered.com/api/storesearch/?term=tales%20of%20arise%20beyond%20the%20dawn&l=en&cc=US', 'buildSteamStoreSearchUrl: expected encoded Steam store search URL');
  assert(buildSteamStoreSearchUrl('   ') === null, 'buildSteamStoreSearchUrl: expected blank queries to be rejected');
}

function testSteamSearchQueriesSplitSlashSeparatedTitles() {
  const { buildSteamSearchQueries } = loadModule('src/core/steam-search.js', [
    'buildSteamSearchQueries'
  ]);

  const queries = buildSteamSearchQueries({
    name: 'Bioskop Simulator / Movie Cinema Simulator'
  });

  assert(queries.includes('bioskop simulator'), 'buildSteamSearchQueries: expected title before slash as its own query');
  assert(queries.includes('movie cinema simulator'), 'buildSteamSearchQueries: expected title after slash as its own query');
  assert(queries.indexOf('bioskop simulator') < queries.indexOf('movie cinema simulator'), 'buildSteamSearchQueries: expected original first slash segment before translated title');
}

function testSteamSearchScoringPrefersDistinctiveExpansionMatch() {
  const { selectSteamSearchResult } = loadModule('src/core/steam-search.js', [
    'selectSteamSearchResult'
  ]);

  const result = selectSteamSearchResult({
    name: 'Tales of ARISE - Beyond the Dawn Edition',
    publisherName: 'BANDAI NAMCO ENTERTAINMENT ASIA PTE LTD'
  }, [
    { appId: '740130', name: 'Tales of ARISE', type: 'app' },
    { appId: '2391960', name: 'Tales of ARISE - Beyond the Dawn Expansion', type: 'app' },
    { appId: '2474002', name: 'Tales of ARISE - Beyond the Dawn Attachment Pack', type: 'app' }
  ]);

  assert(result.status === 'match', 'selectSteamSearchResult: expected confident match for distinctive expansion title');
  assert(result.match.appId === '2391960', 'selectSteamSearchResult: expected Beyond the Dawn Expansion app ID');
  assert(result.candidates[0].appId === '2391960', 'selectSteamSearchResult: expected expansion ranked first');
  assert(result.candidates[1].appId !== '740130', 'selectSteamSearchResult: expected base game not to outrank closer subtitle matches');
}

function testSteamSearchScoringAcceptsExactSlashSegmentMatch() {
  const { selectSteamSearchResult } = loadModule('src/core/steam-search.js', [
    'selectSteamSearchResult'
  ]);

  const result = selectSteamSearchResult({
    name: 'Bioskop Simulator / Movie Cinema Simulator',
    publisherName: 'Akhir Pekan Studio'
  }, [
    { appId: '2682120', name: 'Movie Cinema Simulator', type: 'app' }
  ]);

  assert(result.status === 'match', 'selectSteamSearchResult: expected exact slash-segment match to be confident');
  assert(result.match.appId === '2682120', 'selectSteamSearchResult: expected Movie Cinema Simulator app ID');
}

function testSteamSearchScoringKeepsAmbiguousLowConfidenceMatchesManual() {
  const { normalizeSteamSearchPayload, selectSteamSearchResult } = loadModule('src/core/steam-search.js', [
    'normalizeSteamSearchPayload',
    'selectSteamSearchResult'
  ]);

  const candidates = normalizeSteamSearchPayload({
    items: [
      { id: 111, name: 'Space Adventure Soundtrack', type: 'app' },
      { id: 'bad', name: 'Broken', type: 'app' },
      { id: 222, name: '', type: 'app' },
      { id: 333, name: 'Space Adventure Demo', type: 'app' }
    ]
  });

  assert(candidates.length === 2, 'normalizeSteamSearchPayload: expected invalid candidates removed');

  const result = selectSteamSearchResult({ name: 'Space Adventure Definitive Edition' }, candidates);
  assert(result.status === 'ambiguous', 'selectSteamSearchResult: expected low-confidence add-on matches to require manual choice');
  assert(result.match === null, 'selectSteamSearchResult: expected no automatic match for ambiguous candidates');
  assert(result.candidates.length === 2, 'selectSteamSearchResult: expected candidates to remain available for manual selection');
  assert(selectSteamSearchResult({ name: 'Unknown Game' }, []).status === 'none', 'selectSteamSearchResult: expected empty candidate fallback');
}

const tests = [
  testSafeRenderHelpersRejectUnsafeLinksAndEscapeLabels,
  testDataContractsGiveStableCodesAndFallbacks,
  testSearchIndexPrecomputesFacetsAndFiltersByRelevance,
  testUrlStateRoundTripAndSanitizesInput,
  testUrlStateRejectsNonIntegerFacetIds,
  testRatingGuideCopyIsInformativeCompactStructuredAndLocalized,
  testDescriptorGuideCopyIsInformativeCompactStructuredAndLocalized,
  testSteamDescriptionFormatterBuildsReadableSectionsAndEscapesHtml,
  testSteamDescriptionFormatterKeepsSteamListBlocksTogether,
  testSteamReviewSummaryNormalizesAggregateReviewData,
  testSteamReviewSummaryRejectsInvalidAppIdsAndClampsPercentages,
  testSteamSearchQueriesNormalizeEditionTitles,
  testSteamSearchQueriesSplitSlashSeparatedTitles,
  testSteamSearchScoringPrefersDistinctiveExpansionMatch,
  testSteamSearchScoringAcceptsExactSlashSegmentMatch,
  testSteamSearchScoringKeepsAmbiguousLowConfidenceMatchesManual
];

for (const test of tests) {
  test();
}

console.log(`logic: ${tests.length} checks passed`);
