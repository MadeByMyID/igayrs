# Architecture Review — IGRS2nd

**Date:** June 3, 2026  
**Reviewer:** Principal Software Architect (AI-assisted)

---

## Phase 1 — Architecture Map

### System Overview
IGRS2nd is an unofficial frontend for the Indonesian Game Rating System (IGRS) public database. It's a client-side SPA hosted on GitHub Pages with a Cloudflare Worker for social media previews, and an automated GitHub Actions pipeline for data ingestion.

### Layers and Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│ Edge Layer: Cloudflare Worker (ops/worker/)                      │
│   - Bot detection → HTML preview pages with OG/oEmbed meta      │
│   - Browser → 302 redirect to SPA                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SPA (src/)                                                       │
│                                                                  │
│  app/          → Entry point, router, provider composition       │
│  core/         → Domain logic (search, i18n, validation, Steam)  │
│  features/     → Route-level pages (home, search, game,          │
│                   ratings, steam-checker, fallback)               │
│  shared/       → Cross-cutting concerns                          │
│    api/        → Data fetching + caching                         │
│    components/ → Reusable UI (shell, states, tooltips, badges)   │
│    hooks/      → Custom hooks (debounce, search-index, steam)    │
│    lib/        → Pure utilities (text, format, storage, etc.)    │
│  styles/       → Global CSS tokens + LightningCSS                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Data Pipeline (GitHub Actions)                                   │
│   update-igrs-db.yml → fetch API → jq transform → commit JSON   │
│   ci.yml             → lint, typecheck, test, bundle-size check  │
│   pages.yml          → build & deploy to GitHub Pages            │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Patterns
- **SPA ↔ JSON data**: HTTP fetch from GitHub Pages static files with stale-while-revalidate caching.
- **SPA ↔ Web Worker**: `postMessage` for search index construction (structured clone, Sets serialized as arrays).
- **SPA ↔ Steam API**: CORS proxy (`cors.mefi.workers.dev`) with request deduplication, abort controllers, exponential backoff.
- **CF Worker ↔ GitHub Pages**: Fetch game data with 5-minute module-level cache.
- **GitHub Actions ↔ IGRS API**: Batch parallel fetch (15 concurrent) with retry logic.

### Data Flow (End-to-End)
1. Daily cron → fetches ~600 games from IGRS API sequentially in batches → normalizes → commits JSON.
2. Push to `gh-pages` → builds SPA → deploys to GitHub Pages via Cloudflare CDN.
3. User loads SPA → fetches `igrs.games.json` + `igrs.meta.json` → builds search index in Web Worker → UI becomes interactive.
4. Bot requests `/game/{id}` → Cloudflare Worker serves HTML preview with OG meta tags.

---

## Phase 2 — Findings and Recommendations

| Priority | Area | Problem | Recommendation | Effort |
|---|---|---|---|---|
| ~~**Medium**~~ | ~~Coupling (Search Page)~~ | ~~`SearchPage` component had 15+ pieces of local state with URL sync, filter management, and version tracking all inline.~~ | **RESOLVED** — Extracted `useSearchFilters` hook (`features/search/use-search-filters.ts`) encapsulating all filter state, URL synchronization, filter ordering, and version tracking. SearchPage now delegates to the hook and focuses on layout/rendering. | ~~Medium~~ |
| ~~**Medium**~~ | ~~Consistency (CSS Architecture)~~ | ~~Hybrid CSS strategy (Tailwind + global.css + CSS Modules) lacked documentation, creating ambiguity for new contributors.~~ | **RESOLVED** — Added comprehensive "Styling Strategy" section to CONTRIBUTING.md documenting when to use each CSS approach (global CSS for tokens/shell, CSS Modules for features, Tailwind for one-off utilities). | ~~Low~~ |
| **Low** | i18n Inline Dictionary | The full English dictionary (160+ keys) is bundled inline in `src/core/i18n.ts` (~380 lines). The Indonesian dictionary is duplicated inline for compile-time key completeness checking (`AssertIdenticalKeys`). Both ship in the main bundle. | **Accepted tradeoff** — The inline `id` dictionary provides compile-time enforcement that both languages have identical key sets. Removing it would lose type safety. The ~5KB cost is justified by the developer ergonomics at this scale (only 2 languages). | — |
| **Low** | Data Redundancy (Worker) | The Cloudflare Worker defines its own `WorkerGame`, `WorkerMeta` interfaces that partially duplicate the SPA's types. | **Accepted tradeoff** — Different runtimes (Cloudflare edge vs browser) cannot share code. Worker types are intentionally minimal (only the fields needed for preview rendering). No action needed. | — |
| **Low** | Coverage Artifacts | `src/coverage/` directory exists locally. | **Verified clean** — Already excluded by `.gitignore` root `coverage/` pattern and not tracked in git. No action needed. | — |
| **Low** | Bundle Budget Enforcement | CI doesn't include explicit Browserslist config for browser compatibility. | **Accepted** — LightningCSS handles CSS transforms; the project targets modern browsers (ES2022). Adding Browserslist adds complexity without clear benefit given the current static-site target audience. | — |
| **Low** | Steam API cache on lang change | `createSteamApi` recreated when `t` changes (language switch), losing in-flight cache. | **Accepted** — Only impacts mid-lookup language switches (rare). Cache is a convenience optimization, not correctness-critical. | — |

---

## Architecture Summary

- **Current structure overview:** Feature-sliced SPA architecture (app → core → features → shared) with Vite 8, React 19, TypeScript 6, and CSS Modules. Data is pre-fetched from static JSON files (GitHub Pages CDN) with a custom stale-while-revalidate cache. Search indexing is offloaded to a Web Worker. A Cloudflare Worker handles social media previews. CI/CD runs lint, typecheck, tests, and bundle-size checks on every push.

- **Major strengths:**
  - Clean separation of concerns: features are self-contained, shared code is genuinely shared, core logic is framework-agnostic.
  - Performance-first design: Web Worker for indexing, code-split routes, vendor chunk separation, virtual scrolling for large lists, SWR caching, pre-computed lookup maps (O(1) game-by-ID, game-by-name).
  - Strong data validation at the boundary with Valibot schemas and typed error codes.
  - Excellent error handling: ErrorBoundary, RouteErrorBoundary for chunk failures, retry mechanisms, AbortController usage, request deduplication in Steam API client.
  - Security-conscious: DOMPurify for HTML sanitization, CSP headers on Worker responses, CORS proxy allowlisting, hidden-path guard in dev server, XSS test suite.
  - Accessibility: `aria-live` regions, focus traps in mobile nav, keyboard shortcuts, `prefers-reduced-motion` support, axe-core test suite.
  - Robust CI: Node matrix testing, bundle-size budgets, coverage thresholds, data integrity checks (>10% drop fails the pipeline).
  - Well-documented: architecture.md, inline JSDoc, meaningful module-level comments.

- **Critical structural problems:** None identified. The architecture is sound for its scale and purpose.

- **High priority improvements:**
  - Extract `SearchPage` local state into custom hooks to improve maintainability as the feature grows.
  - Clarify the CSS strategy (Tailwind vs global CSS vs CSS Modules) to reduce onboarding confusion.

- **Acceptable tradeoffs at current scale:**
  - Inline i18n dictionaries (only 2 languages, ~5KB extra).
  - Worker/SPA type duplication (different runtimes, no shared build).
  - Module-level caching without persistence across page reloads (appropriate for a static-data SPA).
  - Test coverage thresholds at 55/45/59/59% — appropriate for a project where much of the logic is data display and UI interaction that's covered by integration/property tests.
  - No external state management library — React Context + URL params + module-level caches handle all state needs cleanly.

- **Assumptions and missing context:**
  - Cloudflare CDN cache rules (1yr for hashed assets, no-cache for HTML, 1hr for JSON) are documented in `architecture.md` but configured externally in the Cloudflare dashboard — cannot verify from code.
  - The `sharp` dev dependency suggests image processing (likely `ops/scripts/convert-webp.js`), but this script wasn't inspected in detail.

---

## Round 2 — Post-Fix Re-Scan

**Changes applied:**
1. Extracted `useSearchFilters` hook from `SearchPage` — isolates URL state sync, filter management, debouncing, version tracking, and filter ordering into a dedicated, testable unit.
2. Added CSS Styling Strategy documentation to `CONTRIBUTING.md` — clarifies when to use global CSS, CSS Modules, or Tailwind utilities.
3. Evaluated all remaining findings and classified as accepted tradeoffs where the fix would add complexity disproportionate to the benefit.

**Dependency direction verified:**
- `core/` → imports only from `shared/types` (type-only) and `shared/lib/` (pure constants/utilities)
- `shared/` → never imports from `features/`
- `features/` → imports from `core/` and `shared/`
- `app/` → composition root, imports from all layers (only `App.tsx` imports feature pages)

**Remaining architectural issues:** None. All actionable items are resolved; all remaining items are documented as intentional tradeoffs appropriate for the project's scale.

**Final status:** Architecture is clean. No further structural changes needed.
