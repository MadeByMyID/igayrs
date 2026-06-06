# Contributing

Thank you for taking the time to improve IGRSDB. This guide explains how to set up the project, make changes safely, verify them, and submit reviewable contributions.

## Before You Start

Read:

- `README.md` for project overview, setup, scripts, data files, and deployment notes.
- `CODE_OF_CONDUCT.md` for participation expectations.
- `SECURITY.md` for vulnerability reporting expectations.
- `LICENSE.md` for the current license status.
- `CHANGELOG.md` for how to record notable changes.

## Contribution Types

Useful contributions include:

- Bug fixes with a clear reproduction.
- Accessibility and responsive layout improvements.
- Search, filtering, and URL-state improvements.
- Data validation and safe-rendering hardening.
- Rating guide or descriptor copy improvements.
- Steam checker mapping improvements.
- Tests, visual compatibility coverage, and documentation.

Avoid unrelated refactors in the same change. Keep each contribution reviewable as a single coherent diff.

## Local Setup

Install dependencies:

```powershell
npm install
```

Start the dev server:

```powershell
npm run dev
```

Run checks:

```powershell
npm run check
```

Run visual compatibility checks for UI changes:

```powershell
npm run visual:check
```

If the visual checker cannot find a browser:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run visual:check
```

## Development Principles

Use this priority order:

1. Correctness and security.
2. Usability and accessibility.
3. Compatibility.
4. Performance.
5. Maintainability.
6. Minimal diff.
7. Polish.

The project is intentionally static and dependency-light. Do not add runtime dependencies unless the benefit is clear and the bundle, maintenance, and security cost is justified.

## Branch and Commit Workflow

1. Create a focused branch.
2. Make the smallest coherent change that solves the problem.
3. Add or update tests when behavior, layout contracts, data contracts, or scripts change.
4. Run the required verification commands.
5. Update documentation or changelog entries when user-facing behavior changes.
6. Open a pull request with reproduction steps, screenshots when useful, and verification output.

Good commit messages are specific:

```text
Fix mobile pagination touch target
Add descriptor guide review cues
Document visual compatibility workflow
```

Avoid vague messages:

```text
update
fix stuff
changes
```

## Testing Expectations

Run `npm run check` for all changes. It performs syntax checks, linting, TypeScript checks, tests, and the production build. Test files live under:

- `src/tests/unit/` — Isolated logic tests
- `src/tests/integration/` — Cross-module and component tests
- `src/tests/property/` — Property-based tests (fast-check)
- `src/tests/performance/` — Budget-based performance tests
- `src/tests/a11y/` — Accessibility tests (axe-core)
- `src/tests/security/` — XSS and injection vector tests
- `src/tests/visual/` — Visual regression and layout tests
- `src/tests/structure/` — Codebase structure and CI validation tests

Run `npm run visual:check` when changing:

- HTML layout.
- CSS.
- Icons.
- Responsive behavior.
- Navigation.
- Search cards.
- Ratings or descriptor cards.
- Steam checker UI.
- Footer or header structure.

The visual checker validates loading, horizontal overflow, clipping, and touch-target sizing across 44 route and viewport combinations.

## UI and Accessibility Guidelines

When changing UI:

- Use semantic HTML.
- Keep keyboard navigation working.
- Preserve visible focus states.
- Keep touch targets at least 44px where practical.
- Respect `prefers-reduced-motion`.
- Avoid text overlap, clipped controls, and horizontal page overflow.
- Avoid hardcoded viewport-specific layout hacks when shared tokens or responsive grids can solve the issue.
- Use `public/assets/icons.svg` and existing shared React components for icons.
- Do not reintroduce emoji or decorative glyphs for UI controls.

## JavaScript Guidelines

When changing JavaScript:

- Prefer existing helpers and modules before adding new abstractions.
- Escape user-visible HTML through `esc` or safe rendering helpers.
- Validate data at loading boundaries, not repeatedly throughout rendering.
- Keep URL state parsing and serialization in `src/core/url-state.ts`.
- Keep search normalization and filtering in `src/core/search-index.ts`.
- Keep localization strings in `src/core/i18n.ts`.
- Keep rating and descriptor guide copy in their dedicated core modules.
- Use stable error codes for data contract failures.

## CSS Guidelines

### Styling Strategy

This project uses two complementary CSS approaches:

1. **Global CSS** (`src/styles/global.css`): Design tokens (custom properties), CSS reset, layout shell (header, footer, app-layout, sidebar), and shared component styles (buttons, loading states, detail cards). This is where site-wide structural styles live.
2. **CSS Modules** (`*.module.css`): Feature-scoped styles for individual pages and components. Use CSS Modules for any styles that are specific to a single feature (search cards, ratings page layout, etc.).

**When choosing where to put a new style:**
- Is it a design token or affects the entire site? → `global.css` `:root` variables
- Is it a layout primitive shared across features (header, footer, cards)? → `global.css`
- Is it specific to one feature or page? → `*.module.css` in that feature's directory

### CSS Rules

When changing CSS:

- Reuse tokens in `:root` before adding one-off values.
- Keep card radius and spacing consistent.
- Keep page sections unframed unless they are actual panels, cards, or tools.
- Check mobile, tablet, desktop, and wide layouts.
- Avoid layout shifts caused by hover states, dynamic text, or loading states.
- Avoid new color palettes that conflict with the current brand system.

## Data Guidelines

When changing data files:

- Preserve JSON validity.
- Keep IDs numeric where the app expects numeric IDs.
- Keep rating, descriptor, platform, and year values compatible with existing filters.
- Do not add private data, secrets, tracking identifiers, or non-public URLs.
- Update `src/core/data-contracts.ts` if the payload shape intentionally changes.
- Add tests for new required fields or compatibility behavior.

## Steam Checker Guidelines

When changing Steam checker behavior:

- Keep external requests bounded by timeout and retry limits.
- Do not expose private API keys or secrets.
- Keep user-facing errors safe and non-diagnostic.
- Preserve support for numeric app IDs and Steam app URLs.
- Treat local developer unlock behavior as a frontend convenience, not authorization.
- Keep generated Steam data, local IGRS matching, and manual descriptor mapping visually distinct.

## Security Guidelines

Do not submit:

- Hardcoded secrets.
- Tokens, cookies, session IDs, or private API keys.
- User tracking without explicit consent.
- Unsafe HTML insertion.
- Path traversal or open redirect behavior.
- Unbounded external requests.
- New external dependencies without justification.

If you find a security issue, follow `SECURITY.md`. Do not publish exploit details in a public issue. Use the least public maintainer contact available and share only the minimum safe detail until triage.

## Documentation Guidelines

Update docs when changing:

- Setup steps.
- Scripts.
- Routes.
- Data locations or data contracts.
- Deployment assumptions.
- Visual compatibility behavior.
- Security posture.
- Contributor workflow.
- License or governance policy.

Update `CHANGELOG.md` for notable user-facing or contributor-facing changes.

## Pull Request Checklist

Before requesting review:

- The change is focused and reviewable.
- `npm run check` passes.
- `npm run visual:check` passes for meaningful UI changes.
- New or changed behavior has test coverage where practical.
- Screenshots or notes are included for visual changes.
- Documentation and changelog entries are updated when relevant.
- No generated report, secret, local-only file, or unrelated refactor is included.

## License Notice for Contributions

By contributing, you confirm that you have the right to submit the contribution and that it can be included in this project under the current `LICENSE.md`. If you are unsure whether code, copy, data, or assets can be contributed, ask before submitting.
