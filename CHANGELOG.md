# Changelog

All notable changes to this project are documented here.

This file follows the Keep a Changelog section model: Added, Changed, Deprecated, Removed, Fixed, and Security. The project package version is currently `0.0.0`; the visible Git history also contains a `v0.0.1` commit message without a tag in this checkout.

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
