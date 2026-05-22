# IGRSDB

IGRSDB is an unofficial, static web interface for browsing game entries from the Indonesian Game Rating System registry. It provides a searchable game database, a ratings guide, content descriptor explanations, and a Steam checker that compares Steam metadata with local IGRS-oriented mappings.

The project is a Vite React application written in TypeScript. It builds to static files in `dist/`, serves public data from `public/assets/data/`, and keeps operational scripts and Worker code under `ops/`.

## What You Can Do

- Search games by title and publisher.
- Filter results by rating, platform, content descriptor, and release year.
- Open detailed game views with rating badges, descriptors, platform metadata, external links, and share links.
- Read age rating and content descriptor guidance.
- Check a Steam app ID or Steam app URL against available Steam IGRS metadata and local descriptor mappings.
- Preserve search state in the URL for repeatable filtered views.
- Run responsive compatibility checks across mobile, tablet, laptop, desktop, and wide-monitor viewports.

## Requirements

- Node.js 18 or newer.
- npm, using the committed `package-lock.json`.
- A Chromium-based browser for `npm run visual:check`.

The visual checker looks for Chrome, Chromium, or Microsoft Edge automatically. If it cannot find one, set `CHROME_PATH`, set `BROWSER_PATH`, or pass `--browser`.

## Quick Start

```powershell
npm install
npm run dev
```

Open the printed local URL, usually:

```text
http://127.0.0.1:5173/
```

Use a different Vite port when needed:

```powershell
npm run dev -- --port 8080
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the Vite dev server against `src/`. |
| `npm run build` | Runs TypeScript build-mode checks and creates `dist/`. |
| `npm run preview` | Serves the production Vite build through Vite preview. |
| `npm run typecheck` | Runs TypeScript project-reference checks. |
| `npm run lint` | Runs ESLint across source, scripts, tests, and Worker code. |
| `npm test` | Runs the Vitest unit, integration, and performance tests. |
| `npm run check` | Runs syntax checks, structure checks, lint, tests, and production build. |
| `npm run serve:static` | Serves `dist/` with the local Node static server. |
| `npm run visual:check` | Starts a temporary Vite server and runs responsive browser checks. |

## Project Structure

```text
.
|-- src/
|   |-- index.html
|   |-- 404.html
|   |-- search/
|   |-- ratings/
|   |-- steamchecker/
|   |-- app/
|   |-- core/
|   |-- features/
|   |-- shared/
|   |-- styles/
|   |-- tests/
|   `-- tools/
|-- config/
|   |-- vite.config.ts
|   |-- tsconfig.json
|   |-- tsconfig.app.json
|   |-- tsconfig.node.json
|   |-- tsconfig.test.json
|   |-- tailwind.config.ts
|   `-- eslint.config.js
|-- public/
|   `-- assets/
|       |-- data/
|       |   |-- images/
|       |   `-- json/
|       `-- icons.svg
|-- ops/
|   |-- scripts/
|   `-- worker/
`-- .github/
```

## Architecture Overview

- `src/main.tsx` mounts the React app.
- `src/app/App.tsx` wires React Router, shared providers, and the application shell.
- `src/app/providers/` owns language/developer-unlock state and lazy IGRS data loading.
- `src/features/` contains route-level UI for home, search, ratings, Steam checker, and fallback pages.
- `src/core/` contains framework-light domain helpers for contracts, search, Steam parsing, URL state, i18n, and guide copy.
- `src/shared/` contains shared API clients, components, hooks, formatting helpers, and types.
- `config/vite.config.ts` sets the Vite root to `src/`, public assets to `public/`, build output to `dist/`, and HTML entries for all public routes.
- `ops/scripts/` contains Node utilities for static serving and visual compatibility checks.
- `ops/worker/` contains the Cloudflare Worker used for `/game/*` preview and redirect behavior.

The app is static at deployment time. Runtime data is fetched from JSON files served with the site, validated at the data-loading boundary, and rendered through React components and safe formatting helpers.

## Data Files

The app reads local JSON files from `public/assets/data/json/`, which Vite serves at `/assets/data/json/`:

- `igrs.meta.json` contains ratings, platforms, descriptors, and metadata.
- `igrs.games.json` contains game entries.
- `steam.meta.json` contains Steam descriptor mapping metadata.
- `igrs.extra.json` contains optional extra fields used when developer fields are unlocked.

Image assets are served from `public/assets/data/images/`:

- Rating badges live under `ratings/`.
- Content descriptor icons live under `descriptors/`.
- Branding assets live at the image root.

The scheduled data workflow in `.github/workflows/update-igrs-db.yml` refreshes IGRS JSON data from public IGRS endpoints and commits changes when the generated files differ.

## Configuration

The main browser app does not require a committed `.env` file.

<details><summary><strong>Optional local and operational settings</strong></summary>

| Setting | Used by | Purpose |
| --- | --- | --- |
| `CHROME_PATH` | `npm run visual:check` | Explicit Chromium, Chrome, or Edge executable path. |
| `BROWSER_PATH` | `npm run visual:check` | Fallback browser executable path. |
| `HOST` | `npm run serve:static` | Host for the Node static server. Defaults to `127.0.0.1`. |
| `PORT` | `npm run serve:static` | Port for the Node static server. Defaults to `5173`. |
| `SERVE_ROOT` | `npm run serve:static` | Directory served by the Node static server. Defaults to the project root, while the npm script passes `dist`. |
| `SITE_ORIGIN` | Cloudflare Worker | Public site origin. `ops/worker/wrangler.toml` sets `https://igrs.madeby.my.id`. |

The Worker code also supports `GAMES_PATH` and `META_PATH` environment overrides for the JSON files it fetches, although those keys are not set in the checked-in Wrangler config.

</details>

## Steam Checker Behavior

The Steam checker accepts either a numeric app ID or a Steam app URL. It extracts the app ID, requests Steam app details through the configured CORS proxy in `src/shared/api/steam-api.ts`, and compares available Steam IGRS metadata with local IGRS records.

External Steam requests use timeouts and bounded retries with backoff and jitter. Review summary data is optional; if Steam reviews cannot be loaded, the main app detail result can still render.

## Developer Unlock

Some fields are hidden by default. The browser unlocks developer fields when either:

- `localStorage.igrs-dev` is set to `1`, or
- the `UNLOCKED=true` cookie is present.

The language toggle also increments a local counter and unlocks developer fields after repeated toggles. This is a frontend-only convenience gate and must not be treated as authorization for protected data.

## Testing and Verification

Run the full project check before handing off a change:

```powershell
npm run check
```

Run visual checks for meaningful UI, layout, route, CSS, or responsive changes:

```powershell
npm run visual:check
```

The visual checker writes `artifacts/visual-compat-report.json`, which is ignored by Git.

## Deployment

Build the app before deployment:

```powershell
npm run build
```

Deploy the generated `dist/` directory to the static host. The visible deployment domain is `igrs.madeby.my.id`, from `CNAME` and `package.json#homepage`.

The build emits route entrypoints for:

- `/`
- `/404.html`
- `/search/`
- `/ratings/`
- `/steamchecker/`

The Cloudflare Worker under `ops/worker/` is configured by `ops/worker/wrangler.toml` for `igrs.madeby.my.id/game/*`.

## Troubleshooting

<details><summary><strong>The page shows a data loading error.</strong></summary>

- Use the dev server instead of opening HTML files directly from disk.
- Confirm `public/assets/data/json/igrs.meta.json` and `public/assets/data/json/igrs.games.json` exist.
- Run `npm run check` to catch syntax, data-contract, lint, test, and build regressions.

</details>

<details><summary><strong>The visual checker cannot find a browser.</strong></summary>

Set an explicit browser path:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run visual:check
```

Or pass it directly:

```powershell
npm run visual:check -- --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

</details>

<details><summary><strong>The Steam checker cannot load data.</strong></summary>

- Confirm the input is a numeric Steam app ID or a Steam app URL containing one.
- Confirm network access is available.
- Confirm the CORS proxy configured in `src/shared/api/steam-api.ts` is reachable.
- Treat review summary failures as non-fatal; the app intentionally allows the main result to render without reviews.

</details>

## Q&A

<details><summary><strong>Can I open `src/index.html` directly in a browser?</strong></summary>

Use `npm run dev`, `npm run preview`, or `npm run serve:static` after building. The app expects Vite/static-host behavior for module loading, route entrypoints, and `/assets/...` public data URLs.

</details>

<details><summary><strong>Why are HTML files under `src/` while data is under `public/`?</strong></summary>

`config/vite.config.ts` sets `src/` as the Vite root and `public/` as the public asset directory. HTML entrypoints belong to the Vite app, while JSON, images, and icon assets must keep stable public URLs under `/assets/...`.

</details>

<details><summary><strong>Which command should I run before opening a pull request?</strong></summary>

Run `npm run check` for all changes. Also run `npm run visual:check` for UI, CSS, route, responsive, or layout changes.

</details>

<details><summary><strong>Where should I change IGRS data?</strong></summary>

Generated public data lives in `public/assets/data/json/`. Keep the shapes compatible with `src/core/data-contracts.ts`. The scheduled GitHub workflow also regenerates `igrs.meta.json`, `igrs.games.json`, and `igrs.extra.json` from public IGRS endpoints.

</details>

<details><summary><strong>Is developer unlock an authorization mechanism?</strong></summary>

No. Developer unlock is local browser state used to reveal optional fields in the static UI. It must not be used to protect private data or privileged behavior.

</details>

<details><summary><strong>Why does the Worker exist if the app is static?</strong></summary>

The Worker handles `/game/*` preview and redirect behavior. It can serve crawler-friendly preview metadata for game links, provide oEmbed payloads, and redirect normal users to the static search page hash route.

</details>

<details><summary><strong>What version should I use for release notes?</strong></summary>

`package.json` currently reports `0.0.0`. The visible Git history contains a `v0.0.1` commit message but no Git tag in this checkout. Confirm the intended release/version policy with a maintainer before publishing versioned release notes.

</details>

## Repository Documentation

- `CONTRIBUTING.md` explains contribution workflow and verification expectations.
- `CHANGELOG.md` tracks notable changes.
- `LICENSE.md` documents the current all-rights-reserved license status.
- `SECURITY.md` explains vulnerability reporting and deployer security notes.
- `CODE_OF_CONDUCT.md` defines participation and enforcement expectations.

## Contributing

Keep changes focused, preserve the static architecture, and use existing helpers before adding new abstractions. Run `npm run check` before handoff, and run `npm run visual:check` for meaningful UI changes.

## License

See `LICENSE.md`. Until the repository owner replaces it with an explicit open-source license, this project is all rights reserved.
