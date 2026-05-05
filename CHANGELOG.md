# Changelog

This changelog tracks notable project changes from the current documentation baseline onward. The format is grouped by release date and change type so contributors can quickly understand user-facing changes, internal maintenance, and verification updates.

## Unreleased

### Added

- Project documentation files: `readme.md`, `changelog.md`, `license.md`, `code_of_conduct.md`, and `contributing.md`.
- Contributor guidance for local setup, test expectations, accessibility checks, security expectations, and pull request review.
- Conservative license status documentation until the repository owner chooses an explicit open-source license.
- Steam checker recent review summaries showing Steam's review label, total reviews, positive reviews, negative reviews, and positive percentage.

### Changed

- Steam checker descriptions now render with structured intro paragraphs, section headings, and scannable feature lists instead of one flat text block.
- Steam checker description parsing now keeps Steam-style list blocks together instead of treating short value lines as headings.

### Verification

- Documentation should be reviewed for accuracy whenever routes, scripts, data locations, worker behavior, or contribution policy changes.
- Steam checker description readability changes should run `npm run check` and `npm run visual:check`.
- Steam review summary changes should keep review data optional so failed review fetches do not block the main Steam checker result.

## 0.0.0 - 2026-05-05

### Added

- Static app pages for home, search, ratings guide, and Steam game checker.
- Node-based static dev server with path traversal protection and basic security headers.
- Browser-native JavaScript module structure under `src/`.
- Search index logic with normalized title, publisher, rating, platform, descriptor, and year filtering.
- URL-backed search state for repeatable filtered search views.
- Runtime data contract checks for local JSON payloads.
- Rating guide copy with summaries, structured criteria, watch-for rows, and official source links.
- Content descriptor guide copy with compact summaries and review-for cues.
- Shared SVG icon sprite and icon rendering helper.
- Responsive visual compatibility runner for mobile, tablet, laptop, desktop, and wide monitor checks.
- Cloudflare Worker preview and redirect support under `worker/`.

### Changed

- Moved root-level assets into categorized folders:
  - Styles under `assets/styles/`.
  - Data JSON under `assets/data/json/`.
  - Images under `assets/data/images/`.
  - App source under `src/`.
  - Tooling under `scripts/` and `tools/`.
- Replaced legacy monolithic frontend script structure with native ES modules.
- Standardized card radius, layout tokens, responsive gutters, panel padding, and focus states.
- Replaced emoji and decorative glyph UI with shared SVG icons.
- Added auto-updating footer year and copyright icon.
- Improved Steam checker layout consistency and result card organization.

### Fixed

- Mobile layout overflow risks in the header, search page, pagination, and footer.
- Small touch-target issue in the mobile pagination jump input.
- Mojibake and non-standard glyph remnants in UI-facing files.
- Search result cards now support keyboard activation.
- Data load failures render stable, user-safe empty/error states.

### Verification

- `npm run check` validates JavaScript syntax and runs UI and logic tests.
- `npm run visual:check` validates 44 page and viewport combinations.
- UI glyph scans exclude data assets and generated reports while checking user-facing source files.

## Changelog Policy

Use these sections when adding entries:

- `Added` for new features, docs, scripts, assets, or routes.
- `Changed` for behavior, layout, copy, structure, or workflow changes.
- `Deprecated` for supported behavior that will be removed later.
- `Removed` for deleted behavior, files, scripts, routes, or public contracts.
- `Fixed` for bug fixes and regressions.
- `Security` for vulnerability fixes or hardening.
- `Verification` for new or changed validation commands.

Keep entries factual and user-facing where possible. Do not use the changelog as a commit log.
