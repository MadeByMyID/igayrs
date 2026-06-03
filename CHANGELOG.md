# Changelog

All notable changes to this project are documented here.

This file follows the Keep a Changelog section model: Added, Changed, Deprecated, Removed, Fixed, and Security. The project package version is currently `0.0.2`; the visible Git history also contains a `v0.0.1` commit message without a tag in this checkout.

## [Unreleased]

### Added

- `ErrorBoundary` class component in `src/shared/components/error-boundary.tsx` with custom fallback render prop, `onError` callback, retry mechanism via `resetError`, and accessible default fallback UI.
- Lazy-loaded `ChangelogModal` via `React.lazy` and `Suspense` — split into a separate 4 KB chunk, no longer included in the main bundle.
- `ChangelogLoadingFallback` component with `role="status"` and `aria-label` for accessible loading state.
- Property-based unit tests using `fast-check` for `normalizeSteamExtras` (type safety), `normalizeSearchText` (output invariants), `recordRecentlyViewed` (list invariants), and `parseIds` (safe parsing).
- Example-based unit tests for `steam-normalize.ts`, `text.ts`, and `use-recently-viewed.ts` covering edge cases (null, undefined, malformed data, boundary conditions).
- Bundle analysis setup with `rollup-plugin-visualizer` activated via `ANALYZE=true` environment variable, outputting to `artifacts/bundle-report.html`.
- Bundle analysis report at `docs/bundle-analysis.md` documenting baseline sizes, per-library breakdown, tree-shaking findings, and actionable recommendations.
- WebP versions of all rating and descriptor PNG images (~60% average size reduction) generated via `ops/scripts/convert-webp.js` using `sharp`.
- `<picture>` element serving pattern with WebP `<source>` and PNG `<img>` fallback in `RatingBadge`, `DescriptorIcons`, `RatingsPage`, and `HomePage`.
- `IMG_RATING_WEBP` and `IMG_DESCRIPTOR_WEBP` path helpers in `src/shared/lib/ratings.ts`.
- Image optimization documentation at `docs/image-optimization.md` covering conversion results, script usage, alternative tools, and browser support.
- `fast-check` 4.8.0 as a pinned dev dependency for property-based testing.
- `rollup-plugin-visualizer` 7.0.1 as a pinned dev dependency for bundle analysis.
- `sharp` as a dev dependency for WebP image conversion.
- Dark/light theme toggle with system preference detection, `localStorage` persistence, and `[data-theme]` CSS attribute.
- `/game/:id` SPA route with dedicated `GamePage` component for deep-linkable game detail pages.
- "Recently Viewed" section on the home page using `sessionStorage` (max 8 games, session-scoped).
- `useRecentlyViewed` hook using `useSyncExternalStore` with cached snapshot for referential stability.
- `ThemeProvider` in `src/app/providers/theme-provider.tsx` managing theme state and `<html>` attribute.
- `GameDetailView` shared component in `src/shared/components/game-detail-view.tsx` eliminating duplication between search inline detail and game page.
- `SteamMatchPanel` exported from the shared `GameDetailView` module for reuse.
- Steam header image display in the Steam Checker result card with URL validation via `safeHttpUrl`.
- Steam Checker now displays: genres, categories, platform availability, Metacritic score, pricing/discount, required age, and banned status.
- "SteamDB" link button next to "Go to Store" in Steam Checker results.
- `src/core/steam-normalize.ts` module for extracting and safely typing additional Steam `appdetails` fields.
- `src/shared/lib/text.ts` — extracted `normalizeSearchText` to fix `core/` ↔ `shared/` dependency cycle.
- `src/shared/lib/ratings.ts` — rating/descriptor name lookups and game extraction helpers.
- `src/shared/lib/platforms.ts` — platform name lookups with cached reverse map for O(1) resolution.
- `src/shared/lib/steam-domain.ts` — Steam app ID parsing, rating conversion, game matching, comparison logic.
- `src/shared/lib/html.ts` — `stripHtml` and `formatExtraField` utilities.
- `src/shared/lib/collections.ts` — shared `toggleSet`, `sortedNumbers`, `sortedYears` utilities.
- `src/features/steam-checker/steam-checker-sidebar.tsx` — extracted sidebar component (~200 lines) from the page file.
- `gamesById` Map on `IgrsData` for O(1) game lookups by ID.
- `gamesByNormalizedName` Map on `IgrsData` for O(1) exact-match game name lookups.
- Pre-computed `stats.publisherCount` and `stats.platformCount` on `IgrsData` to avoid O(n) recalculation on render.
- `fuzzyScorePreNormalized` function for hot-loop search scoring without redundant normalization.
- Keyboard shortcut `/` to focus the search input on the search page.
- Scroll-to-top behavior when changing search result pages.
- Data preload on nav link hover via `ensureData()` in the app shell.
- Content-Type header validation in `fetchJsonResource` before parsing JSON.
- Steam app ID hostname validation — only extracts IDs from known Steam domains.
- Bounded LRU cache with 5-minute TTL for Steam search results (max 100 entries).
- 200ms debounce on Steam lookup in `GameDetailView` to prevent rapid-fire requests.
- Unmount cleanup for abort controllers in Steam Checker page.
- CSS section headers in `legacy.css` for navigability (Base, Layout, Home, Search, Game Cards, Detail, Ratings, Steam Checker).

### Changed

- `ChangelogModal` converted to default export (named export preserved for backward compatibility) to support `React.lazy`.
- `app-shell.tsx` uses `React.lazy` + `Suspense` + `ErrorBoundary` for the changelog modal instead of a static import.
- Rating and descriptor image components now use `<picture>` elements with WebP sources instead of plain `<img>` tags.
- `config/vite.config.ts` converted to async `defineConfig` to support conditional dynamic import of `rollup-plugin-visualizer`.
- Cloudflare Worker now redirects browsers to `/game/:id` instead of `/search/#id`.
- Worker preview page `og:url` and `shareUrl` now point to `/game/:id`.
- `SteamGameDetails` type extended with `header_image`, `short_description`, `type`, `is_free`, `genres`, `categories`, `platforms`, `price_overview`, `metacritic`, `required_age` fields.
- `steam-normalize.ts` uses properly typed field access instead of unsafe `as Record<string, unknown>` casts.
- `DataProvider` tracks pending request's `unlocked` state to prevent race conditions when `unlocked` changes mid-request.
- `useRequiredIgrsData` effect depends only on `ensureData` (stable ref) instead of the full context object.
- `DataProvider` uses `dataRef` to stabilize `ensureData` callback reference.
- `filterIndexedGames` uses `fuzzyScorePreNormalized` in the hot loop, skipping redundant normalization.
- `sortFilterResults` sorts in-place instead of copying the array (input is always fresh from `filterIndexedGames`).
- `platformIdFromName` uses a cached `Map<string, number>` reverse lookup instead of O(n) iteration.
- `SearchIndexItem` now includes pre-built `ratingIdSet`, `descriptorIdSet`, `platformIdSet` for O(1) filter checks.
- `findGameByName` accepts optional `nameIndex` parameter for O(1) exact matches before fuzzy fallback.
- Steam Checker sidebar always attempts local game match (not just when `rating_generated` is true).
- `search-page.tsx` reduced from ~350 lines to ~200 lines by using shared `GameDetailView`.
- `steam-checker-page.tsx` reduced from ~450 lines to ~210 lines by extracting sidebar.
- `domain.ts` converted to a 7-line barrel re-export (logic split into 4 focused modules).
- `highlight()` function returns plain text nodes for non-matching segments instead of wrapping in `<span>`.
- Descriptor icon sizing uses `object-fit: contain` with fixed 52×52px dimensions for consistency.
- Dark mode CSS converted from `@media (prefers-color-scheme: dark)` to `[data-theme="dark"]` selectors for manual toggle support.
- Home page uses pre-computed `data.stats` instead of computing publisher/platform counts on every render.
- Recently viewed items show release year for disambiguation.
- Game page back button falls back to `/search/` when `history.length <= 2` (prevents exiting the app on direct navigation).

### Fixed

- Race condition in `DataProvider` where changing `unlocked` mid-request could return stale data from the wrong state.
- `useRequiredIgrsData` over-triggering effects on every state change (now depends only on stable `ensureData` ref).
- `use-recently-viewed.ts` infinite render loop caused by `getSnapshot` returning new array references (fixed with cached snapshot and `undefined` sentinel for invalidation).
- Memory leak in Steam Checker — abort controller now cleaned up on component unmount.
- Descriptor icon "character appearance" appearing larger than others (fixed with `object-fit: contain`).
- Tooltip not styled in dark mode (added `[data-theme="dark"] .descriptor-icon .tooltip` rule).

### Security

- Steam header image URLs validated through `safeHttpUrl()` before rendering in `<img>` tags.
- `parseSteamAppId` now validates hostnames — only extracts app IDs from `steampowered.com` and `steamcommunity.com` domains.
- `fetchJsonResource` validates `Content-Type` header before parsing response as JSON.
- Cloudflare Worker `gamesById` Map bounded to 50,000 entries to prevent unbounded memory growth.

## [0.0.2]

### Added

- `SECURITY.md` with vulnerability-reporting guidance, supported-version scope, disclosure expectations, and deployer security notes.
- README Q&A entries for setup, route structure, data files, visual checks, developer unlock behavior, Worker purpose, and version ambiguity.
- README configuration reference for supported local script and Worker environment settings.

### Changed

- README onboarding now documents `npm run serve:static`, CI/data-refresh workflows, the static deployment target, and the current folder structure.
- Code of conduct now uses a Contributor Covenant-inspired structure with explicit reporting and enforcement sections.
- Contributing guidance now points security reports to `SECURITY.md`.

### Fixed

- Documentation references now use the repository's uppercase Markdown file names.

### Security

- Security reporting guidance now explicitly avoids public exploit details and marks the missing private security contact as requiring maintainer completion.

## [0.0.1] - 2026-05-05

### Added

- Static app pages for home, search, ratings guide, and Steam game checker.
- Node-based static server with path traversal protection and basic security headers.
- Browser-native JavaScript module structure under `src/`.
- Search index logic with normalized title, publisher, rating, platform, descriptor, and year filtering.
- URL-backed search state for repeatable filtered search views.
- Runtime data contract checks for local JSON payloads.
- Rating guide copy with summaries, structured criteria, watch-for rows, and official source links.
- Content descriptor guide copy with summaries and review cues.
- Shared SVG icon sprite and icon rendering helper.
- Responsive visual compatibility runner for mobile, tablet, laptop, desktop, and wide-monitor checks.
- Cloudflare Worker preview and redirect support for `/game/*`.
- GitHub Actions workflow for CI checks.
- GitHub Actions workflow for refreshing public IGRS data.
- Project documentation files for README, changelog, license, code of conduct, and contributing guidance.

### Changed

- Moved root-level assets into categorized folders for styles, data JSON, images, app source, scripts, and tooling.
- Replaced the legacy monolithic frontend script structure with native modules.
- Standardized card radius, layout tokens, responsive gutters, panel padding, and focus states.
- Replaced emoji and decorative glyph controls with shared SVG icons.
- Added auto-updating footer year and copyright icon.
- Improved Steam checker layout consistency and result-card organization.

### Removed

- Legacy monolithic `script.js` frontend implementation.

### Fixed

- Mobile layout overflow risks in the header, search page, pagination, and footer.
- Small touch-target issue in the mobile pagination jump input.
- Mojibake and non-standard glyph remnants in UI-facing files.
- Search result cards support keyboard activation.
- Data load failures render stable user-safe empty/error states.

### Security

- Added static-server path traversal protection.
- Added basic static-server security headers.
- Added safe rendering helpers for user-visible HTML generated from data.

## Changelog Maintenance

- Add entries under `[Unreleased]` as part of the same change that introduces them.
- Keep entries factual and grounded in code, docs, workflows, or visible history.
- Do not use the changelog as a commit log.
- Move `[Unreleased]` entries into a dated version section when the project owner creates a release.
