# IGRSDB

IGRSDB is an unofficial, static web interface for browsing game entries from the Indonesian Game Rating System registry. It provides a searchable game database, a readable ratings guide, content descriptor explanations, and a Steam game checker that compares Steam metadata against local IGRS-oriented mappings.

This project is designed to run without a frontend build step. The app is plain HTML, CSS, and browser-native JavaScript modules, with Node.js used only for local development and verification scripts.

## Features

- Search games by title and publisher.
- Filter results by rating, platform, content descriptor, and release year.
- Open detailed game views with rating badges, descriptors, platform metadata, external links, and share links.
- Read compact but informative age rating and content descriptor guidance.
- Check a Steam app ID or Steam app URL against available Steam IGRS metadata and local descriptor mappings.
- Preserve search state in the URL for repeatable filtered views.
- Support keyboard navigation, visible focus states, touch-friendly controls, and reduced-motion preferences.
- Run responsive compatibility checks across mobile, tablet, laptop, desktop, and wide-monitor viewports.

## Tech Stack

- Static HTML pages for the main routes.
- CSS in `assets/styles/main.css`.
- Browser-native ES modules under `src/`.
- JSON data and image assets under `assets/data/`.
- Node.js scripts for local serving and visual compatibility checks.
- Cloudflare Worker code under `worker/` for preview and redirect behavior.
- No runtime npm dependencies.

## Requirements

- Node.js 18 or newer.
- A Chromium-based browser for `npm run visual:check`.

The visual checker looks for Chrome, Chromium, or Microsoft Edge automatically. If it cannot find one, set `CHROME_PATH` or pass `--browser`.

## Quick Start

Install dependencies:

```powershell
npm install
```

Run the local dev server:

```powershell
npm run dev
```

Open the printed localhost URL, usually:

```text
http://127.0.0.1:5173/
```

Use another port if needed:

```powershell
npm run dev -- --port 8080
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the static local dev server. |
| `npm test` | Runs the UI consistency and logic regression tests. |
| `npm run check` | Runs JavaScript syntax checks plus the full test suite. |
| `npm run visual:check` | Starts a temporary local server and runs responsive browser checks. |

## Project Structure

```text
.
|-- index.html
|-- search/
|   `-- index.html
|-- ratings/
|   `-- index.html
|-- steamchecker/
|   `-- index.html
|-- assets/
|   |-- data/
|   |   |-- images/
|   |   `-- json/
|   |-- icons.svg
|   `-- styles/
|-- src/
|   |-- main.js
|   `-- core/
|-- scripts/
|-- tests/
|-- tools/
|-- worker/
`-- .github/
```

## Data Files

The app reads local JSON files from `assets/data/json/`:

- `igrs.meta.json` contains ratings, platforms, descriptors, and metadata.
- `igrs.games.json` contains game entries.
- `steam.meta.json` contains Steam descriptor mapping metadata.
- `igrs.extra.json` contains optional extra fields used when developer fields are unlocked.

Image assets are served from `assets/data/images/`:

- Rating badges live under `ratings/`.
- Content descriptor icons live under `descriptors/`.
- Branding assets live at the image root.

The app validates loaded data through `src/core/data-contracts.js` before rendering. Invalid or unavailable required data renders a user-safe error state instead of failing silently.

## Main Modules

| File | Responsibility |
| --- | --- |
| `src/main.js` | App entry, page initialization, rendering, events, Steam checker flow. |
| `src/core/constants.js` | Shared paths, rating order, and official source URLs. |
| `src/core/data-contracts.js` | Runtime validation and normalization for JSON payloads. |
| `src/core/descriptor-guide.js` | Localized descriptor guide summaries and review cues. |
| `src/core/icons.js` | Shared SVG icon rendering helper. |
| `src/core/i18n.js` | English and Indonesian UI strings. |
| `src/core/rating-guide.js` | Localized age rating guide copy. |
| `src/core/safe-render.js` | HTML escaping and safe external URL rendering helpers. |
| `src/core/search-index.js` | Normalized search index, facets, and filtering. |
| `src/core/url-state.js` | Query-string parsing and serialization for search state. |

## Steam Checker Behavior

The Steam checker accepts either a numeric app ID or a Steam app URL. It extracts the app ID, requests Steam app details through the configured CORS proxy, and compares available Steam IGRS metadata with local IGRS records.

The checker shows:

- A local IGRS reference card when a reliable generated Steam rating can be matched to a local game name.
- A Steam rating card based on Steam-provided IGRS metadata.
- A recent reviews summary with Steam's review label, total review count, positive count, negative count, and positive percentage.
- A release and action card with copy, Steam, and IGRS links.
- A manual mapping card only when developer fields are unlocked.

External Steam requests use timeouts and bounded retries with backoff and jitter. Review summary data is optional; if Steam reviews cannot be loaded, the main app detail result still renders.

## Developer Unlock

Some fields are intentionally hidden by default. The browser unlocks developer fields when either:

- `localStorage.igrs-dev` is set to `1`, or
- the `UNLOCKED=true` cookie is present.

The language toggle also increments a local counter and unlocks developer fields after repeated toggles. This is a frontend-only convenience gate and must not be treated as authorization for protected data.

## Responsive Compatibility

Run:

```powershell
npm run visual:check
```

The checker covers:

- 320px, 375px, 390px, and 430px mobile widths.
- 768px portrait tablet.
- 1024px landscape tablet.
- 1280px laptop.
- 1366px, 1440px, and 1920px desktop widths.
- 2560px wide monitor.

It checks the home page, search page, ratings page, and Steam checker page for loading failures, horizontal overflow, clipped key elements, and small touch targets. A JSON report is written to `artifacts/visual-compat-report.json`.

## Accessibility Notes

- Interactive controls use visible `:focus-visible` states.
- Touch targets are kept at or above 44px where practical.
- Motion is reduced when `prefers-reduced-motion: reduce` is set.
- SVG icons used for decoration are hidden from assistive technology.
- Meaningful icon-only or icon-adjacent content has text labels or screen-reader text.

## Security Notes

- The local dev server rejects path traversal and unsupported HTTP methods.
- Dev server responses include basic security headers such as `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`.
- User-visible HTML generated from data is escaped through shared helpers.
- External links are passed through safe URL helpers where they are generated dynamically.
- No secrets should be committed. Use environment variables or deployment platform secrets for private configuration.

## Deployment

The main app can be deployed as static files from the repository root. Ensure the host serves:

- `.html` as `text/html`.
- `.js` as JavaScript modules.
- `.css` as CSS.
- `.json` as JSON.
- `.svg` and `.png` image assets with correct content types.

Search, ratings, and Steam checker routes are directory-based and expect their `index.html` files to be served at:

- `/search/`
- `/ratings/`
- `/steamchecker/`

## Troubleshooting

If the page shows a data loading error:

- Confirm the dev server is being used instead of opening HTML files directly from disk.
- Confirm `assets/data/json/igrs.meta.json` and `assets/data/json/igrs.games.json` exist.
- Run `npm run check` to catch syntax and data-flow regressions covered by tests.

If `npm run visual:check` cannot find a browser:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run visual:check
```

If the Steam checker cannot load data:

- Confirm the app ID is numeric after parsing.
- Confirm network access is available.
- Confirm the CORS proxy used in `src/main.js` is reachable.

## Contributing

Read `contributing.md` before opening a change. The short version is:

- Keep changes focused.
- Run `npm run check`.
- Run `npm run visual:check` for meaningful UI or layout changes.
- Do not commit secrets, private data, generated reports, or unrelated refactors.

## License

See `license.md`. Until the repository owner replaces it with an explicit open-source license, this project is all rights reserved.
