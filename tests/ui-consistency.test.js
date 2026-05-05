#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML_PAGES = [
  'index.html',
  '404.html',
  'search/index.html',
  'ratings/index.html',
  'steamchecker/index.html'
];
const REQUIRED_NAV_KEYS = ['nav.search', 'nav.ratings', 'nav.steamchecker'];
const REQUIRED_STRUCTURE_PATHS = [
  'assets/icons.svg',
  'assets/styles/main.css',
  'assets/data/json/igrs.meta.json',
  'assets/data/images/favicon.svg',
  '404.html',
  'src/main.js',
  'src/core/constants.js',
  'src/core/data-contracts.js',
  'src/core/descriptor-guide.js',
  'src/core/icons.js',
  'src/core/i18n.js',
  'src/core/rating-guide.js',
  'src/core/safe-render.js',
  'src/core/search-index.js',
  'src/core/steam-description.js',
  'src/core/steam-search.js',
  'src/core/steam-reviews.js',
  'src/core/url-state.js',
  'scripts/dev-server.js',
  'scripts/visual-compat.js',
  'tools/visual-compat-runner.html'
];
const TEXT_UI_FILES = [
  'index.html',
  '404.html',
  'search/index.html',
  'ratings/index.html',
  'steamchecker/index.html',
  'src/main.js',
  'src/core/i18n.js',
  'assets/styles/main.css',
  'worker/worker.js'
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function testEveryPageHasCompletePrimaryNavigation() {
  for (const page of HTML_PAGES) {
    const html = read(page);
    const header = html.match(/<div class="header-actions">([\s\S]*?)<\/div>/);
    assert(header, `${page}: missing header-actions`);
    for (const key of REQUIRED_NAV_KEYS) {
      const count = countMatches(header[1], new RegExp(`data-i18n="${key}"`, 'g'));
      assert(count === 1, `${page}: expected one ${key} link, found ${count}`);
    }
  }
}

function testProjectStructureIsCategorized() {
  for (const relativePath of REQUIRED_STRUCTURE_PATHS) {
    assert(fs.existsSync(path.join(ROOT, relativePath)), `${relativePath}: expected categorized project path to exist`);
  }

  assert(!fs.existsSync(path.join(ROOT, 'style.css')), 'style.css: shared styles should live at assets/styles/main.css');
  assert(!fs.existsSync(path.join(ROOT, 'script.js')), 'script.js: app entry should live at src/main.js');
  assert(!fs.existsSync(path.join(ROOT, 'dev-server.js')), 'dev-server.js: tooling should live at scripts/dev-server.js');

  const packageJson = JSON.parse(read('package.json'));
  assert(packageJson.scripts.dev === 'node scripts/dev-server.js', 'package.json: dev script should point to scripts/dev-server.js');
  assert(packageJson.scripts['visual:check'] === 'node scripts/visual-compat.js', 'package.json: visual:check should run the responsive compatibility checker');
  assert(packageJson.scripts.check.includes('node --check src/main.js'), 'package.json: check script should validate src/main.js');
  assert(packageJson.scripts.check.includes('node --check src/core/icons.js'), 'package.json: check script should validate src/core/icons.js');
  assert(packageJson.scripts.check.includes('node --check src/core/steam-description.js'), 'package.json: check script should validate src/core/steam-description.js');
  assert(packageJson.scripts.check.includes('node --check src/core/steam-search.js'), 'package.json: check script should validate src/core/steam-search.js');
  assert(packageJson.scripts.check.includes('node --check src/core/steam-reviews.js'), 'package.json: check script should validate src/core/steam-reviews.js');
  assert(packageJson.scripts.check.includes('node --check scripts/visual-compat.js'), 'package.json: check script should validate scripts/visual-compat.js');

  for (const page of HTML_PAGES) {
    const html = read(page);
    assert(html.includes('href="assets/styles/main.css"'), `${page}: expected shared stylesheet link`);
    assert(html.includes('src="src/main.js"'), `${page}: expected module script entry`);
    assert(html.includes('type="module"'), `${page}: expected native module script`);
    assert(!html.includes('href="style.css"'), `${page}: should not reference root style.css`);
    assert(!html.includes('src="script.js"'), `${page}: should not reference root script.js`);
  }
}

function testNativeModulesHaveClearBoundaries() {
  const main = read('src/main.js');
  assert(main.includes("from './core/constants.js'"), 'src/main.js: expected constants module import');
  assert(main.includes("from './core/data-contracts.js'"), 'src/main.js: expected data contract module import');
  assert(main.includes("from './core/descriptor-guide.js'"), 'src/main.js: expected descriptor guide copy module import');
  assert(main.includes("from './core/i18n.js'"), 'src/main.js: expected i18n module import');
  assert(main.includes("from './core/rating-guide.js'"), 'src/main.js: expected rating guide copy module import');
  assert(main.includes("from './core/safe-render.js'"), 'src/main.js: expected safe rendering module import');
  assert(main.includes("from './core/search-index.js'"), 'src/main.js: expected search index module import');
  assert(main.includes("from './core/url-state.js'"), 'src/main.js: expected URL state module import');
  assert(!main.includes('(function ()'), 'src/main.js: native module should not keep the old IIFE wrapper');
  assert(read('src/core/i18n.js').includes('export const I18N'), 'src/core/i18n.js: expected named I18N export');
  assert(read('src/core/constants.js').includes('export const RATING_ORDER'), 'src/core/constants.js: expected named rating order export');
  assert(read('src/core/data-contracts.js').includes('export function assertGamesPayload'), 'src/core/data-contracts.js: expected game payload contract export');
  assert(read('src/core/descriptor-guide.js').includes('export function getDescriptorGuideCopy'), 'src/core/descriptor-guide.js: expected readable descriptor guide copy export');
  assert(read('src/core/icons.js').includes('export function icon'), 'src/core/icons.js: expected shared icon renderer export');
  assert(read('src/core/rating-guide.js').includes('export function getRatingGuideCopy'), 'src/core/rating-guide.js: expected readable rating guide copy export');
  assert(read('src/core/safe-render.js').includes('export function safeHttpUrl'), 'src/core/safe-render.js: expected safe URL export');
  assert(read('src/core/search-index.js').includes('export function createGameSearchIndex'), 'src/core/search-index.js: expected search index export');
  assert(read('src/core/steam-description.js').includes('export function renderSteamDescription'), 'src/core/steam-description.js: expected Steam description renderer export');
  assert(read('src/core/steam-search.js').includes('export function selectSteamSearchResult'), 'src/core/steam-search.js: expected Steam search scorer export');
  assert(read('src/core/steam-reviews.js').includes('export function normalizeSteamReviewSummary'), 'src/core/steam-reviews.js: expected Steam review summary normalizer export');
  assert(read('src/core/url-state.js').includes('export function readSearchState'), 'src/core/url-state.js: expected URL state export');
}

function testEmojiGlyphsAreReplacedWithIcons() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');
  const icons = read('assets/icons.svg');

  assert(main.includes("from './core/icons.js'"), 'src/main.js: expected UI actions to use the shared icon renderer');
  assert(main.includes("iconLabel('copy', t('detail.share'))"), 'src/main.js: share actions should render a copy icon and label');
  assert(main.includes("icon('gamepad', 'empty-state-svg')"), 'src/main.js: empty game states should use an SVG icon');
  assert(icons.includes('<symbol id="copyright"'), 'assets/icons.svg: expected copyright icon symbol');
  assert(icons.includes('<symbol id="globe"'), 'assets/icons.svg: expected globe icon symbol');
  assert(icons.includes('<symbol id="arrow-up"'), 'assets/icons.svg: expected scroll-top arrow icon symbol');
  assert(icons.includes('<symbol id="gamepad"'), 'assets/icons.svg: expected empty-state gamepad icon symbol');
  assert(/\.ui-icon\s*{[\s\S]*?width:\s*1em;(?=[\s\S]*?height:\s*1em;)/.test(css), 'style.css: shared SVG icons should have stable inline dimensions');
  assert(/\.empty-state-svg\s*{[\s\S]*?width:\s*2\.4rem;(?=[\s\S]*?height:\s*2\.4rem;)/.test(css), 'style.css: empty-state SVG icon should have stable dimensions');

  for (const page of HTML_PAGES) {
    const html = read(page);
    assert(html.includes('assets/icons.svg#globe'), `${page}: language toggle should use the shared globe icon`);
  }

  const searchHtml = read('search/index.html');
  assert(searchHtml.includes('assets/icons.svg#arrow-up'), 'search/index.html: scroll-top button should use the shared arrow-up icon');

  const forbidden = /[\u{1f300}-\u{1faff}\u{1d400}-\u{1d7ff}\u2190-\u21ff\u2026\u00b7\u00f0\u00e2\u00c2]/u;
  for (const file of TEXT_UI_FILES) {
    assert(!forbidden.test(read(file)), `${file}: UI text should not contain emoji, arrow glyphs, ellipses, bullets, or mojibake`);
  }
}

function testFooterUsesCopyrightIconAndDynamicYear() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');

  assert(main.includes('function applyFooterYear'), 'src/main.js: expected shared footer year updater');
  assert(main.includes('getUTCFullYear()'), 'src/main.js: footer year should be generated dynamically from the current date');
  assert(main.includes("querySelectorAll('[data-current-year]')"), 'src/main.js: footer year should target every page footer marker');
  assert(!/data-current-year[\s\S]{0,80}20\d{2}/.test(main), 'src/main.js: footer year should not be hardcoded');
  assert(/\.footer-line\s*{[\s\S]*?display:\s*flex;(?=[\s\S]*?flex-wrap:\s*wrap;)/.test(css), 'style.css: footer line should keep content responsive');
  assert(/\.footer-copyright\s*{[\s\S]*?display:\s*inline-flex;/.test(css), 'style.css: copyright cluster should align icon and year');

  for (const page of HTML_PAGES) {
    const html = read(page);
    assert(html.includes('class="footer-line"'), `${page}: footer should use the shared footer line layout`);
    assert(html.includes('assets/icons.svg#copyright'), `${page}: footer should use the copyright icon symbol`);
    assert(html.includes('<span class="sr-only">Copyright</span>'), `${page}: footer copyright icon should have screen-reader text`);
    assert(html.includes('data-current-year'), `${page}: footer should expose a dynamic year target`);
    assert(!/copyright[^<]*20\d{2}/i.test(html), `${page}: footer year should not be hardcoded in HTML`);
  }
}

function testAccentColorMatchesPrimaryFamily() {
  const css = read('assets/styles/main.css');
  assert(css.includes('--primary-light: #f4efff;'), 'style.css: primary-light should use the purple brand family');
  assert(!css.includes('rgba(42, 125, 110'), 'style.css: focus rings should not use the old green accent');
}

function testPanelRadiusIsConsistent() {
  const css = read('assets/styles/main.css');
  assert(css.includes('--radius: 8px;'), 'style.css: shared card radius should be 8px');
  assert(!css.includes('border-radius: 20px;'), 'style.css: large one-off shell radius should be normalized');
}

function testMobileHeaderAndHeroStayInViewport() {
  const css = read('assets/styles/main.css');
  assert(/\.header-actions\s*{[\s\S]*?min-width:\s*0;/.test(css), 'style.css: header actions need min-width: 0 to prevent mobile overflow');
  const mobileHeaderInner = css.match(/@media \(max-width: 600px\)[\s\S]*?\.header-inner\s*{(?<body>[^}]*)}/);
  assert(mobileHeaderInner?.groups?.body?.includes('display: grid;'), 'style.css: mobile header should use a single-column grid');
  const mobileHeaderActions = css.match(/@media \(max-width: 600px\)[\s\S]*?\.header-actions\s*{(?<body>[^}]*)}/);
  assert(mobileHeaderActions?.groups?.body?.includes('flex: none;'), 'style.css: mobile header actions should size within the padded header grid');
  assert(mobileHeaderActions?.groups?.body?.includes('flex-direction: column;'), 'style.css: mobile header actions should stack to avoid clipped nav buttons');
  assert(/\.header-lang-toggle\s*{(?=[^}]*background:\s*#fff;)(?=[^}]*position:\s*absolute;)[^}]*}/.test(css), 'style.css: mobile language toggle should be visible and anchored inside the top header row');
  assert(/\.hero-logo\s*{[\s\S]*?width:\s*260px;/.test(css), 'style.css: hero logo should fit with stats/actions in a desktop viewport');
}

function testRatingsGuideUsesReadableStructuredContent() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');

  assert(main.includes('rating-summary'), 'src/main.js: expected rating cards to render plain-language summaries');
  assert(main.includes('rating-guide-list'), 'src/main.js: expected rating cards to render scannable bullet lists');
  assert(main.includes('rating-watch-row'), 'src/main.js: expected rating cards to render watch-for chips');
  assert(main.includes('rating-official'), 'src/main.js: expected official criteria to remain available inside a disclosure');
  assert(main.includes('rating-source'), 'src/main.js: expected official criteria to include a source link');
  assert(main.includes('safeExternalLink(OFFICIAL_RATING_INFO_URL'), 'src/main.js: expected source link to use the safe external link helper');
  assert(read('src/core/constants.js').includes("OFFICIAL_RATING_INFO_URL = 'https://igrs.id/rating-info'"), 'src/core/constants.js: expected official IGRS rating-info URL');
  assert(read('src/core/i18n.js').includes("'ratings.source': 'Source'"), 'src/core/i18n.js: expected source label copy');
  assert(/\.rating-guide-list\s*{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(180px,\s*1fr\)\);/.test(css), 'style.css: rating guide bullets should use responsive readable columns');
  assert(/\.rating-watch-row\s*{[\s\S]*?min-height:\s*44px;/.test(css), 'style.css: rating watch rows should keep touch-friendly height');
  assert(/\.rating-source\s*{[\s\S]*?border-top:\s*1px solid var\(--border\);/.test(css), 'style.css: rating source should be visually separated inside the official disclosure');
}

function testDescriptorGuideUsesReadableStructuredContent() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');

  assert(main.includes('descriptor-guide-card'), 'src/main.js: expected descriptor cards to use the readable guide layout');
  assert(main.includes('descriptor-summary'), 'src/main.js: expected descriptor cards to render compact summaries');
  assert(main.includes('descriptor-review-line'), 'src/main.js: expected descriptor cards to render Review for inline');
  assert(main.includes('descriptor-review-items'), 'src/main.js: expected descriptor cards to render styled review tokens');
  assert(!main.includes('descriptor-cue-row'), 'src/main.js: descriptor cards should not render styled cue rows');
  assert(!main.includes('descriptor-cue-tags'), 'src/main.js: descriptor cards should not render styled cue chips');
  assert(!main.includes('descriptor-more'), 'src/main.js: descriptor cards should not render the More context disclosure');
  assert(!main.includes('descriptor-guide-list'), 'src/main.js: descriptor cards should not render dense review sections');
  assert(!read('src/core/i18n.js').includes('descriptors.moreContext'), 'src/core/i18n.js: More context copy should be removed');
  assert(/\.descriptor-grid\s*{[\s\S]*?minmax\(280px,\s*1fr\)/.test(css), 'style.css: descriptor grid should use balanced compact card tracks');
  const reviewTokenRule = css.match(/\.descriptor-review-items span\s*{(?<body>[^}]*)}/);
  assert(reviewTokenRule, 'style.css: descriptor review tokens should have a style rule');
  assert(!reviewTokenRule.groups.body.includes('border:'), 'style.css: descriptor review tokens should be styled without borders');
  assert(!css.includes('.descriptor-cue-row'), 'style.css: descriptor cue row styles should be removed');
  assert(!css.includes('.descriptor-cue-tags'), 'style.css: descriptor cue chip styles should be removed');
  assert(!css.includes('.descriptor-more'), 'style.css: descriptor More context styles should be removed');
}

function testSearchPageHasActionableUxTouchpoints() {
  const html = read('search/index.html');
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');
  const i18n = read('src/core/i18n.js');

  assert(html.includes('id="active-filter-summary"'), 'search/index.html: expected active filter summary region');
  assert(main.includes('function renderActiveFilterSummary'), 'src/main.js: expected active filter summary renderer');
  assert(main.includes('function clearAllSearchState'), 'src/main.js: expected single clear-all search path');
  assert(main.includes('descriptor-preview'), 'src/main.js: expected result cards to show descriptor preview');
  assert(main.includes('tabindex="0"'), 'src/main.js: expected result cards to be keyboard focusable');
  assert(main.includes("event.key === 'Escape'"), 'src/main.js: expected Escape key handling for search inputs');
  assert(main.includes('pagination-status'), 'src/main.js: expected pagination context line');
  assert(i18n.includes("'search.active': 'Active'"), 'src/core/i18n.js: expected active filter label copy');
  assert(i18n.includes("'page.status': 'Page {page} of {total}'"), 'src/core/i18n.js: expected pagination status copy');
  assert(/\.active-filter-summary\s*{[\s\S]*?min-height:\s*44px;/.test(css), 'style.css: active filter summary should keep touch-friendly height');
  assert(/\.game-card:focus-visible\s*{[\s\S]*?box-shadow:\s*0 0 0 3px/.test(css), 'style.css: game cards need visible keyboard focus');
  assert(/\.descriptor-preview\s*{[\s\S]*?display:\s*flex;/.test(css), 'style.css: descriptor preview should have compact flex layout');
  assert(/\.pagination-status\s*{[\s\S]*?text-align:\s*center;/.test(css), 'style.css: pagination status should be centered');
}

function testSteamDescriptionsUseReadableStructuredFormatting() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');

  assert(main.includes("from './core/steam-description.js'"), 'src/main.js: expected Steam description renderer import');
  assert(main.includes('renderSteamDescription(gameDescription)'), 'src/main.js: expected Steam result to render structured description HTML');
  assert(main.includes('class="steam-result-description-shell"'), 'src/main.js: expected Steam description shell');
  assert(!main.includes('<p class="detail-description steam-result-description">${esc(gameDescription)}</p>'), 'src/main.js: Steam description should not render as one flat paragraph');
  assert(/\.steam-description\s*{[\s\S]*?max-width:\s*72ch;/.test(css), 'style.css: Steam description should keep a readable line length');
  assert(/\.steam-description-section\s*{[\s\S]*?border-top:\s*1px solid var\(--border\);/.test(css), 'style.css: Steam description sections should have subtle separation');
  assert(/\.steam-description-list\s*{[\s\S]*?display:\s*grid;/.test(css), 'style.css: Steam description feature lines should become scannable lists');
  assert(/\.steam-description h3\s*{[\s\S]*?color:\s*var\(--primary\);/.test(css), 'style.css: Steam description headings should stand out');
}

function testSteamCheckerShowsRecentReviewSummary() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');
  const i18n = read('src/core/i18n.js');

  assert(main.includes("from './core/steam-reviews.js'"), 'src/main.js: expected Steam review summary module import');
  assert(main.includes('fetchSteamReviewSummary(trimmed)'), 'src/main.js: expected optional Steam review summary fetch during submit');
  assert(main.includes('buildSteamReviewsUrl(appId)'), 'src/main.js: expected Steam reviews endpoint builder usage');
  assert(main.includes('normalizeSteamReviewSummary'), 'src/main.js: expected Steam review summary normalization');
  assert(main.includes('function renderSteamReviewSummaryCard'), 'src/main.js: expected review summary card renderer');
  assert(main.includes('steam-review-summary-card'), 'src/main.js: expected recent reviews card');
  assert(main.includes('steamReviewSummary'), 'src/main.js: expected Steam review summary to be passed into result rendering');
  assert(i18n.includes("'steamchecker.recentReviews': 'Recent reviews'"), 'src/core/i18n.js: expected recent reviews label');
  assert(i18n.includes("'steamchecker.totalReviews': 'Total reviews'"), 'src/core/i18n.js: expected total reviews label');
  assert(/\.steam-review-summary-card\s*{[\s\S]*?gap:\s*0\.75rem;/.test(css), 'style.css: review summary card should have compact spacing');
  assert(/\.steam-review-score\s*{[\s\S]*?font-size:\s*1\.05rem;/.test(css), 'style.css: review score should be visually prominent');
  assert(/\.steam-review-metrics\s*{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(css), 'style.css: review metrics should be scannable');
}

function testSteamCheckerHasHeaderStoreAction() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');
  const i18n = read('src/core/i18n.js');
  const icons = read('assets/icons.svg');

  assert(main.includes('steam-result-header-actions'), 'src/main.js: expected Steam result header to expose action slot');
  assert(main.includes('steam-result-store-btn'), 'src/main.js: expected Steam result header to include a store action button');
  assert(main.includes("iconLabel('external-link', t('steamchecker.goToStore'))"), 'src/main.js: expected store action to use a shared external-link icon');
  assert(i18n.includes("'steamchecker.goToStore': 'Go to Store'"), 'src/core/i18n.js: expected store action label copy');
  assert(read('src/core/icons.js').includes("'external-link'"), 'src/core/icons.js: expected external-link icon id to be registered');
  assert(icons.includes('<symbol id="external-link"'), 'assets/icons.svg: expected external-link icon symbol');
  assert(/\.steam-result-header\s*{[\s\S]*?display:\s*flex;(?=[\s\S]*?justify-content:\s*space-between;)/.test(css), 'style.css: Steam result header should align title and store action');
  assert(/\.steam-result-store-btn\s*{[\s\S]*?white-space:\s*nowrap;/.test(css), 'style.css: Steam store action should keep compact button text on desktop');
  assert(/@media \(max-width: 600px\)[\s\S]*?\.steam-result-header\s*{[\s\S]*?flex-direction:\s*column;/.test(css), 'style.css: Steam result header action should stack on small screens');
}

function testDetailPageCanDiscoverSteamMatches() {
  const main = read('src/main.js');
  const css = read('assets/styles/main.css');
  const i18n = read('src/core/i18n.js');

  assert(main.includes("from './core/steam-search.js'"), 'src/main.js: expected Steam search helper import');
  assert(main.includes('findSteamMatchForGame(game)'), 'src/main.js: expected detail pages to start Steam match lookup');
  assert(main.includes('detail-steam-match'), 'src/main.js: expected detail page Steam match region');
  assert(main.includes('renderDetailSteamMatch'), 'src/main.js: expected Steam match renderer');
  assert(main.includes('buildSteamSearchQueries(game)'), 'src/main.js: expected generated Steam search query variants');
  assert(main.includes('selectSteamSearchResult(game, candidates)'), 'src/main.js: expected confidence-gated Steam selection');
  assert(i18n.includes("'detail.steamLookup.loading': 'Finding Steam match...'"), 'src/core/i18n.js: expected Steam lookup loading copy');
  assert(i18n.includes("'detail.steamLookup.title': 'Steam ID Finder'"), 'src/core/i18n.js: expected persistent Steam ID Finder title copy');
  assert(i18n.includes("'detail.steamLookup.notFound': 'Not found'"), 'src/core/i18n.js: expected Steam lookup not-found copy');
  assert(i18n.includes("'detail.steamLookup.possible': 'Possible Steam matches'"), 'src/core/i18n.js: expected Steam lookup possible matches copy');
  assert(main.includes("renderDetailSteamMatch(document.getElementById('detail-steam-match'), { status: 'none' })"), 'src/main.js: failed Steam lookup should leave a visible not-found panel');
  assert(/\.steam-match-panel\s*{[\s\S]*?width:\s*100%;/.test(css), 'style.css: Steam match panel should fit below detail actions');
  assert(/\.steam-match-status\s*{[\s\S]*?font-size:\s*0\.9rem;/.test(css), 'style.css: Steam match status should have readable not-found text');
  assert(/\.steam-match-options\s*{[\s\S]*?display:\s*flex;/.test(css), 'style.css: Steam match options should wrap responsively');
}

function testMissingRoutesUseAccessibleFallbackPage() {
  const html = read('404.html');
  const css = read('assets/styles/main.css');
  const main = read('src/main.js');
  const server = read('scripts/dev-server.js');
  const runner = read('tools/visual-compat-runner.html');

  assert(html.includes('id="fallback-page"'), '404.html: expected a dedicated fallback page landmark');
  assert(html.includes('<base href="/">'), '404.html: missing routes need a root base URL so assets resolve outside the missing path');
  assert(html.includes('data-i18n="fallback.notFound.title"'), '404.html: expected localized fallback title');
  assert(html.includes('data-i18n="fallback.notFound.help"'), '404.html: expected a second recovery hint for missing pages');
  assert(html.includes('assets/icons.svg#alert-triangle'), '404.html: expected alert icon instead of emoji');
  assert(html.includes('href="search/"'), '404.html: expected search recovery action');
  assert(html.includes('href="ratings/"'), '404.html: expected ratings recovery action');
  assert(/\.fallback-page\s*{[\s\S]*?min-height:\s*calc\(100vh - 220px\);/.test(css), 'style.css: fallback page should keep the message centered in available space');
  assert(/\.fallback-actions\s*{[\s\S]*?display:\s*flex;(?=[\s\S]*?min-height:\s*44px;)/.test(css), 'style.css: fallback actions should be responsive and touch-friendly');
  assert(main.includes('const needsData = isSearch || isRatings || isHome || isSteamChecker;'), 'src/main.js: fallback pages should not load the game database');
  assert(read('src/core/i18n.js').includes("'fallback.notFound.help':"), 'src/core/i18n.js: expected localized recovery hint copy');
  assert(server.includes("const FALLBACK_404 = path.join(ROOT, '404.html');"), 'scripts/dev-server.js: expected a shared 404 fallback path');
  assert(server.includes('serveNotFound(response, request.method ==='), 'scripts/dev-server.js: missing routes should serve the HTML fallback with 404 status');
  assert(runner.includes("label: 'not-found'"), 'tools/visual-compat-runner.html: visual checker should cover the missing-route fallback');
}

function testLayoutSystemUsesSharedShellAndMobileOrder() {
  const css = read('assets/styles/main.css');

  for (const token of [
    '--layout-wide: 1280px;',
    '--layout-page: 1040px;',
    '--layout-readable: 860px;',
    '--layout-gutter:',
    '--layout-gap:',
    '--panel-padding:',
    '--card-padding:'
  ]) {
    assert(css.includes(token), `style.css: expected shared layout token ${token}`);
  }

  assert(/\.header-inner\s*{[\s\S]*?max-width:\s*var\(--layout-wide\);/.test(css), 'style.css: header shell should use shared wide layout');
  assert(/\.app-layout\s*{[\s\S]*?max-width:\s*var\(--layout-wide\);(?=[\s\S]*?padding:\s*var\(--layout-gutter\);)(?=[\s\S]*?gap:\s*var\(--layout-gap\);)/.test(css), 'style.css: search shell should use shared layout spacing');
  assert(/\.page-container\s*{[\s\S]*?max-width:\s*var\(--layout-page\);(?=[\s\S]*?padding:\s*var\(--layout-gutter\);)/.test(css), 'style.css: page container should use shared page width and gutter');
  assert(/\.ratings-page\s*{[\s\S]*?max-width:\s*var\(--layout-page\);/.test(css), 'style.css: ratings page should use shared page width');
  assert(/\.steam-checker-page\s*{[\s\S]*?max-width:\s*var\(--layout-wide\);/.test(css), 'style.css: steam checker should use shared wide width');
  assert(/\.rating-card,\s*\.descriptor-card,\s*\.game-card\s*{[\s\S]*?padding:\s*var\(--card-padding\);/.test(css), 'style.css: major cards should share card padding');

  const mobileBlock = css.match(/@media \(max-width: 900px\)\s*{(?<body>[\s\S]*?)@media \(max-width: 600px\)/);
  assert(mobileBlock, 'style.css: expected 900px responsive block');
  assert(mobileBlock.groups.body.includes('.main-content {\n    display: contents;'), 'style.css: mobile search layout should promote main content children for ordering');
  assert(!mobileBlock.groups.body.includes('.main-content, .search-section'), 'style.css: mobile search section should remain a panel, not display contents');
  assert(/\.search-section\s*{[\s\S]*?order:\s*1;/.test(mobileBlock.groups.body), 'style.css: mobile search panel should appear before filters');
  assert(/\.sidebar\s*{[\s\S]*?order:\s*2;/.test(mobileBlock.groups.body), 'style.css: mobile filters should follow the search panel');
}

function testResponsiveCompatibilityCheckerCoversViewportsAndRoutes() {
  const runner = read('tools/visual-compat-runner.html');
  const script = read('scripts/visual-compat.js');

  for (const label of [
    'mobile-320',
    'mobile-375',
    'mobile-430',
    'tablet-768',
    'tablet-landscape',
    'laptop-1280',
    'desktop-1366',
    'desktop-1920',
    'wide-2560'
  ]) {
    assert(runner.includes(label), `tools/visual-compat-runner.html: expected viewport ${label}`);
  }

  for (const route of ['/', '/search/?rating=6&page=1', '/ratings/', '/steamchecker/', '/missing-page-for-visual-check']) {
    assert(runner.includes(route), `tools/visual-compat-runner.html: expected route ${route}`);
  }

  assert(runner.includes('scrollWidth'), 'tools/visual-compat-runner.html: expected horizontal overflow checks');
  assert(runner.includes('getBoundingClientRect'), 'tools/visual-compat-runner.html: expected element clipping checks');
  assert(runner.includes('minTouchTarget'), 'tools/visual-compat-runner.html: expected touch-target checks');
  assert(script.includes('CHROME_PATH'), 'scripts/visual-compat.js: expected browser path override support');
  assert(script.includes('artifacts/visual-compat-report.json'), 'scripts/visual-compat.js: expected deterministic visual report output');
}

const tests = [
  testProjectStructureIsCategorized,
  testNativeModulesHaveClearBoundaries,
  testEmojiGlyphsAreReplacedWithIcons,
  testFooterUsesCopyrightIconAndDynamicYear,
  testEveryPageHasCompletePrimaryNavigation,
  testAccentColorMatchesPrimaryFamily,
  testPanelRadiusIsConsistent,
  testMobileHeaderAndHeroStayInViewport,
  testRatingsGuideUsesReadableStructuredContent,
  testDescriptorGuideUsesReadableStructuredContent,
  testSearchPageHasActionableUxTouchpoints,
  testSteamDescriptionsUseReadableStructuredFormatting,
  testSteamCheckerShowsRecentReviewSummary,
  testSteamCheckerHasHeaderStoreAction,
  testDetailPageCanDiscoverSteamMatches,
  testMissingRoutesUseAccessibleFallbackPage,
  testLayoutSystemUsesSharedShellAndMobileOrder,
  testResponsiveCompatibilityCheckerCoversViewportsAndRoutes
];

for (const test of tests) {
  test();
}

console.log(`ui-consistency: ${tests.length} checks passed`);
