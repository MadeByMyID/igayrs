# IGRSDB

IGRSDB is an unofficial, static web interface for browsing game entries from the Indonesian Game Rating System registry. Built with Vite 8, React 19, and TypeScript 6, it provides a searchable database from the current 593-game checked-in data snapshot, a ratings guide, content descriptor explanations, and a Steam checker that compares Steam metadata with IGRS records.

## Prerequisites

- Node.js 18 or newer
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
config/           Build configuration (Vite, TypeScript, ESLint, Tailwind, bundle-size thresholds)
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
  src/tests/      Unit, integration, property-based, and structure tests
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

The test suite includes unit tests, integration tests, property-based tests (fast-check), and structure tests.

## Troubleshooting

<details><summary>The page shows a data loading error</summary>

- Use the dev server (`npm run dev`) instead of opening HTML files directly.
- Confirm `public/assets/data/json/igrs.meta.json` and `igrs.games.json` exist.
- Run `npm run check` to catch regressions.

</details>

<details><summary>The visual checker cannot find a browser</summary>

Set an explicit browser path:

```bash
CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run visual:check
```

</details>

<details><summary>The Steam checker cannot load data</summary>

- Confirm the input is a numeric Steam app ID or a Steam app URL.
- Confirm network access and that the CORS proxy is reachable.

</details>

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow, verification expectations, and code standards.

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community participation and enforcement expectations.

## Additional Documentation

- [CHANGELOG.md](./CHANGELOG.md) — Notable changes
- [LICENSE.md](./LICENSE.md) — License (all rights reserved until replaced)
- [SECURITY.md](./SECURITY.md) — Vulnerability reporting
- [docs/architecture.md](./docs/architecture.md) — System architecture details
- [docs/bundle-analysis.md](./docs/bundle-analysis.md) — Bundle composition and optimization
- [docs/image-optimization.md](./docs/image-optimization.md) — WebP conversion and serving pattern
- [docs/cache-strategy.md](./docs/cache-strategy.md) — Caching approach

## License

See [LICENSE.md](./LICENSE.md). Until replaced with an explicit open-source license, this project is all rights reserved.
