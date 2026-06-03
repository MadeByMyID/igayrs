# Bundle Analysis Report

**Date:** 2025-05-26
**Tool:** rollup-plugin-visualizer 7.0.1 (treemap mode)
**Build:** Vite 8.0.14 + Rollup (production)
**Command:** `$env:ANALYZE="true"; npm run build`

## Baseline Chunk Sizes

| Chunk | Raw Size | Gzip Size | Brotli (est.) |
|-------|----------|-----------|---------------|
| `assets/main-Di0JijbP.js` | 355.54 KB | 110.13 KB | ~92 KB |
| `assets/main-D96n28T-.css` | 49.72 KB | 9.69 KB | ~8 KB |
| `assets/changelog-modal-C6frwfrF.js` | 4.02 KB | 1.80 KB | ~1.6 KB |
| **Total JS** | **359.56 KB** | **111.93 KB** | |
| **Total CSS** | **49.72 KB** | **9.69 KB** | |

### Per-Library Breakdown (main chunk)

| Library | Gzip Size | Raw Size | Modules | % of JS gzip |
|---------|-----------|----------|---------|--------------|
| react-dom | 85.0 KB | 458.7 KB | 4 | 77.1% |
| react-router | 22.3 KB | 90.0 KB | 1 | 20.2% |
| lucide-react | 6.8 KB | 10.3 KB | 28 | 6.2% |
| react | 4.8 KB | 16.3 KB | 4 | 4.4% |
| valibot | 2.7 KB | 13.2 KB | 1 | 2.4% |
| scheduler | 2.5 KB | 9.2 KB | 2 | 2.2% |
| **App code** | **55.4 KB** | **195.1 KB** | **49** | — |

### App Code by Directory

| Directory | Gzip Size | Files |
|-----------|-----------|-------|
| shared/components | 7.4 KB | 8 |
| features/search | 5.7 KB | 3 |
| features/steam-checker | 4.9 KB | 2 |
| core/descriptor-guide.ts | 4.6 KB | 1 |
| shared/lib | 4.5 KB | 9 |
| core/i18n.ts | 3.7 KB | 1 |
| core/rating-guide.ts | 3.4 KB | 1 |
| shared/api | 3.2 KB | 2 |
| app/providers | 2.3 KB | 3 |
| Other (14 modules) | ~15.7 KB | 20 |

## Identified Issues

### Issue 1: react-router includes full framework (SSR/RSC) — HIGH IMPACT

**Finding:** The bundled `react-router` chunk (`chunk-4N6VE7H7.mjs`) is 90 KB raw / 22.3 KB gzip. This includes the complete React Router v7 framework: SSR support, RSC (React Server Components) integration, `HydratedRouter`, `createCallServer`, route discovery, and streaming utilities.

**Root cause:** react-router v7 ships a single entry point that re-exports everything. The `react-router-dom` package imports `HydratedRouter` and `RouterProvider` from `react-router`, which pulls in the entire `chunk-4N6VE7H7.mjs` containing SSR/RSC code. Tree-shaking cannot eliminate these because they share a single chunk with the client-side router internals.

**Impact:** ~22 KB gzip of dead code for a client-only SPA that only uses `BrowserRouter`, `Link`, `NavLink`, `Route`, `Routes`, `useNavigate`, `useSearchParams`, `useLocation`, and `useParams`.

### Issue 2: react-dom dominates the bundle — INFORMATIONAL

**Finding:** `react-dom` accounts for 85 KB gzip (77% of the total JS bundle). The `react-dom-client.production.js` module alone is 452 KB raw / 84.8 KB gzip.

**Root cause:** This is inherent to React 19's architecture. The reconciler, event system, and DOM diffing are all in this single module.

**Impact:** Not directly actionable without switching frameworks, but worth noting as the baseline cost of React.

### Issue 3: valibot full module included — LOW IMPACT

**Finding:** `valibot/dist/index.mjs` contributes 13.2 KB raw / 2.7 KB gzip.

**Root cause:** Valibot is imported from its main entry point. The library is designed to be tree-shakeable, and at 2.7 KB gzip the bundler is likely already eliminating unused validators. This is a reasonable size for a schema validation library.

**Impact:** Minimal. Valibot is already well-optimized for tree-shaking.

### Issue 4: lucide-react icon infrastructure overhead — LOW IMPACT

**Finding:** 28 lucide-react modules total 10.3 KB raw / 6.8 KB gzip. Of this, ~2.5 KB gzip is shared infrastructure (Icon component, utilities like `mergeClasses`, `toKebabCase`, `toPascalCase`, `toCamelCase`, `hasA11yProp`, `defaultAttributes`, `context`, `createLucideIcon`).

**Root cause:** Each icon imports the shared `createLucideIcon` factory and utility functions. The per-icon overhead is small (~200-400 bytes gzip each), but the shared infrastructure is always included.

**Impact:** Low. The 19 icons used are individually small and tree-shaking is working correctly (only used icons are bundled).

### Issue 5: No route-level code splitting — MEDIUM IMPACT

**Finding:** All page components (search, steam-checker, ratings, home, game, fallback) are in the main bundle. The only lazy-loaded chunk is `changelog-modal` (4 KB / 1.8 KB gzip).

**Root cause:** `App.tsx` uses `<Route element={<SearchPage />}>` with static imports for all page components.

**Impact:** ~17 KB gzip of page-specific code is loaded upfront regardless of which page the user visits.

## Actionable Recommendations

### 1. Route-level code splitting (Medium effort, Medium impact)

Convert page components to lazy-loaded routes:

```tsx
// src/app/App.tsx
const SearchPage = lazy(() => import('@/features/search/search-page'));
const SteamCheckerPage = lazy(() => import('@/features/steam-checker/steam-checker-page'));
const RatingsPage = lazy(() => import('@/features/ratings/ratings-page'));
const GamePage = lazy(() => import('@/features/game/game-page'));
```

**Expected savings:** ~10-15 KB gzip off the initial load for users who land on the home page.

### 2. Monitor react-router bundle in future versions (Low effort)

React Router v7's architecture bundles SSR/RSC code alongside client code. Options:
- Watch for future react-router releases that improve tree-shaking of SSR code
- Consider using `react-router` directly (without `-dom` wrapper) with manual `createBrowserRouter` to see if tree-shaking improves
- If bundle size becomes critical, evaluate lighter alternatives for client-only routing

**Expected savings:** Potentially 10-15 KB gzip if SSR/RSC code can be eliminated in a future version.

### 3. Evaluate static data extraction (Low effort, Low impact)

`descriptor-guide.ts` (4.6 KB gzip) and `rating-guide.ts` (3.4 KB gzip) contain static metadata. If these are pure data (no logic), they could be:
- Loaded as JSON via `fetch()` on demand
- Split into a separate chunk loaded only when the ratings/descriptor pages are visited

**Expected savings:** ~8 KB gzip moved to on-demand loading (pairs well with recommendation 1).

### 4. Keep current lucide-react approach (No action needed)

The current named-import pattern (`import { Search } from 'lucide-react'`) is already optimal. Tree-shaking is working correctly — only 19 icons are bundled out of 1000+ available.

## Summary

| Category | Current | Potential Savings |
|----------|---------|-------------------|
| Total JS (gzip) | 110.1 KB | — |
| Route splitting | 0 routes split | -10-15 KB initial |
| react-router dead code | 22.3 KB | -10-15 KB (future) |
| Static data extraction | In main bundle | -8 KB initial |
| **Realistic near-term target** | **110.1 KB** | **~90-95 KB** |

The bundle is reasonably well-optimized for a React SPA. The largest opportunity is route-level code splitting, which would reduce the initial load by moving page-specific code to on-demand chunks. The react-router overhead is a known limitation of v7's architecture and may improve in future releases.
