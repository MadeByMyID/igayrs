# IGRSDB

IGRSDB is an unofficial, static web interface for browsing game entries from the Indonesian Game Rating System registry. Built with Vite 8, React 19, and TypeScript 6, it provides a searchable database from the current 593-game checked-in data snapshot, a ratings guide, content descriptor explanations, and a Steam checker that compares Steam metadata with IGRS records.

## Prerequisites

- Node.js 22.12.0 or newer
- npm 9 or newer (using the committed `package-lock.json`)
- A Chromium-based browser for `npm run visual:check` (optional)

## Quick Start

```bash
git clone https://github.com/<your-org>/IGRS2nd.git
cd IGRS2nd
npm install
npm run dev
```

Open the printed local URL (usually `http://127.0.0.1:5173/`).

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| Dev server | `npm run dev` | Starts the Vite dev server with hot reload for local development. |
| Build | `npm run build` | Runs TypeScript type checking and creates a production build in `dist/`. |
| Preview | `npm run preview` | Serves the production build locally through Vite preview. |
| Type check | `npm run typecheck` | Runs TypeScript project-reference checks without emitting files. |
| Lint | `npm run lint` | Runs ESLint across source, scripts, tests, and Worker code. |
| Test | `npm test` | Runs the Vitest unit, integration, property-based, and performance tests. |
| Full check | `npm run check` | Runs syntax checks, structure checks, lint, tests, and production build — use before PRs. |
| Visual check | `npm run visual:check` | Starts a temporary Vite server and runs responsive browser checks across viewports. |
| Static serve | `npm run serve:static` | Serves `dist/` with the local Node static server for manual testing. |
| Pages build | `npm run build:pages-root` | Builds and syncs branch-root Pages files for branch-source publishing. |

## Folder Structure

```text
.github/          GitHub Actions workflows (CI, Pages deploy, data refresh)
artifacts/        Generated reports (bundle analysis, visual compat) — gitignored
config/           Build configuration (Vite, TypeScript, ESLint, bundle-size thresholds)
docs/             Project documentation (architecture, bundle analysis, image optimization, cache strategy)
ops/              Operational code — deployment scripts and Cloudflare Worker
  ops/scripts/    Node utilities for static serving, WebP conversion, visual checks
  ops/worker/     Cloudflare Worker for social media previews and oEmbed
public/           Static assets served at stable URLs (JSON data, images, icons)
scripts/          CI helper scripts (bundle size checking)
src/              Application source code
  src/app/        App shell, router, providers (theme, language, data)
  src/core/       Framework-light domain logic (search indexing, i18n, contracts, Steam normalization)
  src/features/   Route-level UI (home, search, game, ratings, steam-checker, fallback)
  src/shared/     Shared API clients, reusable components, hooks, and utility libraries
  src/styles/     Global CSS (tokens, reset, typography) and feature CSS modules
  src/tests/      Unit, integration, property-based, performance, a11y, security, visual, and structure tests
```

## Architecture Overview

IGRSDB is a single-page application deployed as static files to GitHub Pages. The Vite + React SPA fetches game data from co-hosted JSON files at runtime, builds an in-memory search index (via Web Worker), and renders all UI client-side. A Cloudflare Worker intercepts `/game/:id` requests from social media bots and crawlers to serve rich OG/oEmbed preview metadata; normal browsers are redirected to the SPA where React renders the game detail page. The build produces code-split chunks (vendor, per-route lazy chunks, CSS modules) with content hashes for immutable caching.

```text
┌─────────────────────┐       ┌──────────────────┐
│  Browser (SPA)      │──────▶│  GitHub Pages    │
│  Vite + React + TS  │ fetch │  Static Assets   │
│  Web Worker (search)│       │  HTML/JS/CSS/JSON│
└─────────────────────┘       └──────────────────┘
                                       ▲
┌─────────────────────┐                │ fetch game data
│  Cloudflare Worker  │────────────────┘
│  Social previews    │
│  oEmbed responses   │
└─────────────────────┘
```

For full architecture details including data flow, deployment topology, and key decisions, see [docs/architecture.md](./docs/architecture.md).

## Deployment

The app deploys to GitHub Pages via `.github/workflows/pages.yml`:

1. CI runs the full project check (`npm run check`)
2. Production build generates `dist/` with hashed assets
3. GitHub Actions deploys the `dist/` artifact to Pages

The live site is served at `igrs.madeby.my.id` (configured via `CNAME`).

The Cloudflare Worker (`ops/worker/`) is deployed separately via Wrangler and handles `/game/:id` routes for social media previews. It has a staging environment for pre-production testing.

Hashed assets use `Cache-Control: public, max-age=31536000, immutable`. HTML files use `Cache-Control: no-cache` to ensure fresh content on navigation.

## Data Files

The app reads JSON files from `public/assets/data/json/` (served at `/assets/data/json/`):

| File | Contents |
| --- | --- |
| `igrs.meta.json` | Ratings, platforms, descriptors, and metadata |
| `igrs.games.json` | Game entries |
| `steam.meta.json` | Steam descriptor mapping metadata |
| `igrs.extra.json` | Optional extra fields for developer mode |

The scheduled workflow in `.github/workflows/update-igrs-db.yml` refreshes IGRS JSON data from public endpoints and commits changes when files differ.

## Configuration

The browser app does not require a `.env` file. Optional settings:

| Setting | Used by | Purpose |
| --- | --- | --- |
| `ANALYZE` | `npm run build` | Set to `true` to generate `artifacts/bundle-report.html` |
| `CHROME_PATH` | `npm run visual:check` | Explicit Chromium/Chrome/Edge executable path |
| `SITE_ORIGIN` | Cloudflare Worker | Public site origin (set in `ops/worker/wrangler.toml`) |

## Testing

Run the full project check before submitting changes:

```bash
npm run check
```

Run visual checks for UI, layout, or responsive changes:

```bash
npm run visual:check
```

The test suite includes unit tests, integration tests, property-based tests (fast-check), performance tests, accessibility tests (axe-core), security tests (XSS vectors), visual compatibility tests, and structure tests.

## Troubleshooting

<details><summary><strong>The page shows a data loading error</strong></summary>

- Use the dev server (`npm run dev`) instead of opening HTML files directly.
- Confirm `public/assets/data/json/igrs.meta.json` and `igrs.games.json` exist.
- Run `npm run check` to catch regressions.

</details>

<details><summary><strong>The visual checker cannot find a browser</strong></summary>

Set an explicit browser path:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run visual:check
```

On macOS/Linux:

```bash
CHROME_PATH="/usr/bin/google-chrome" npm run visual:check
```

The script searches common Chromium/Chrome/Edge paths on Windows, macOS, and Linux. If none are found, pass the path explicitly.

</details>

<details><summary><strong>The Steam checker cannot load data</strong></summary>

- Confirm the input is a numeric Steam app ID or a Steam app URL.
- Confirm network access and that the CORS proxy is reachable.
- The CORS proxy is configured in `src/shared/api/steam-api.ts`.

</details>

<details><summary><strong>npm install fails or uses wrong package manager</strong></summary>

This project enforces npm via a `preinstall` script. If you see an error about package managers, confirm you are running `npm install` and not `yarn`, `pnpm`, or `bun`.

</details>

<details><summary><strong>TypeScript errors after pulling changes</strong></summary>

Run `npm install` to ensure dependencies are current, then `npm run typecheck`. The project uses TypeScript 6 with strict mode, `noUncheckedIndexedAccess`, and project references (see `config/tsconfig.json`).

</details>

## Q&A

<details><summary><strong>What Node.js version do I need?</strong></summary>

Node.js 22.12.0 or newer. The `engines` field in `package.json` enforces this. CI tests on Node 22 and 24.

</details>

<details><summary><strong>Why does the project use multiple HTML entry points?</strong></summary>

Vite is configured with multiple rollup inputs (`src/index.html`, `src/404.html`, `src/ratings/index.html`, `src/search/index.html`, `src/steamchecker/index.html`). Each maps to a route that GitHub Pages can serve directly, enabling deep-link navigation without server-side rewriting. All entry points render the same React app but at different base paths.

</details>

<details><summary><strong>How does the search work without a backend?</strong></summary>

The SPA fetches `igrs.games.json` at runtime, posts the array to a Web Worker (`src/core/search-index.worker.ts`), which builds a normalized in-memory index. Filtering and scoring happen client-side with pre-normalized strings and pre-built Sets for O(1) filter checks. The index supports fuzzy matching, multi-field filtering, and faceted counts.

</details>

<details><summary><strong>What is the Cloudflare Worker for?</strong></summary>

Social media bots (Discord, Slack, Telegram, Twitter) do not execute JavaScript. The Worker at `ops/worker/` intercepts `/game/:id` requests from bots and returns server-rendered HTML with Open Graph and oEmbed metadata. Normal browsers get a 302 redirect to the SPA. Deploy with `wrangler deploy` from the `ops/worker/` directory.

</details>

<details><summary><strong>How does the data refresh pipeline work?</strong></summary>

A daily GitHub Actions cron (`.github/workflows/update-igrs-db.yml`) fetches all games from the IGRS public API in parallel batches (15 concurrent, chunked by ID range), normalizes data with `jq`, runs the project test suite against the new data, validates integrity (fails if game count drops >10%), and commits the resulting JSON files. If any step fails, an issue is created automatically.

</details>

<details><summary><strong>How do I generate a bundle analysis report?</strong></summary>

```powershell
$env:ANALYZE = "true"
npm run build
```

This produces `artifacts/bundle-report.html` (treemap visualization) via `rollup-plugin-visualizer`. See `docs/bundle-analysis.md` for the latest findings.

</details>

<details><summary><strong>What are the bundle size limits?</strong></summary>

Configured in `config/bundle-size.json`: JavaScript < 200 KB gzip, CSS < 30 KB gzip. CI runs `scripts/check-bundle-size.js` which measures all files in `dist/assets/` and fails if thresholds are exceeded.

</details>

<details><summary><strong>How do I add a new page/route?</strong></summary>

1. Create a feature directory under `src/features/`.
2. Add an HTML entry point under `src/` if the route needs a direct GitHub Pages path (e.g., `src/newpage/index.html`).
3. Register the route in `src/app/App.tsx` (use `React.lazy` for code splitting).
4. Add the HTML entry to `config/vite.config.ts` → `build.rollupOptions.input`.
5. Update navigation in the app shell if needed.

</details>

<details><summary><strong>What is the "developer unlock" / extra data?</strong></summary>

`igrs.extra.json` contains optional media URLs (video, in-game screenshots). The app conditionally loads this file based on local UI state. This is a frontend convenience for development visibility — it has no authorization or security significance.

</details>

<details><summary><strong>Why is the version still 0.0.2?</strong></summary>

The project has not cut a formal release beyond the initial versions. The `package.json` version is `0.0.2`. Changes are tracked in the `[Unreleased]` section of `CHANGELOG.md` and will be promoted to a dated version when the maintainer creates a release.

</details>

<details><summary><strong>How do I work on the Cloudflare Worker locally?</strong></summary>

```bash
cd ops/worker
npm install
npm run dev
```

This starts `wrangler dev` for local Worker development. The Worker has its own `package.json`, `tsconfig.json`, and `wrangler.toml`. Type-check with `npm run typecheck` from within the `ops/worker/` directory.

</details>

<details><summary><strong>Why are there CSS Modules AND global CSS?</strong></summary>

Global CSS (`src/styles/global.css`) handles design tokens, CSS reset, typography, and site-wide layout. CSS Modules (`*.module.css`) handle feature-scoped styles. See the "Styling Strategy" section in `CONTRIBUTING.md` for guidance on when to use each approach.

</details>

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow, verification expectations, and code standards.

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community participation and enforcement expectations.

## Additional Documentation

- [CHANGELOG.md](./CHANGELOG.md) — Notable changes
- [LICENSE.md](./LICENSE.md) — License (all rights reserved until replaced)
- [SECURITY.md](./SECURITY.md) — Vulnerability reporting
- [docs/architecture.md](./docs/architecture.md) — System architecture details
- [docs/architecture-review.md](./docs/architecture-review.md) — Architecture review findings
- [docs/bundle-analysis.md](./docs/bundle-analysis.md) — Bundle composition and optimization
- [docs/image-optimization.md](./docs/image-optimization.md) — WebP conversion and serving pattern
- [docs/cache-strategy.md](./docs/cache-strategy.md) — Caching approach
- [docs/performance-review.md](./docs/performance-review.md) — Performance optimization details

## License

See [LICENSE.md](./LICENSE.md). Until replaced with an explicit open-source license, this project is all rights reserved.
