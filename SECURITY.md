# Security Policy

## Supported Versions

| Version or branch | Supported |
| --- | --- |
| Current repository state and active deployment at `https://igrs.madeby.my.id/` | Yes |
| Older commits, generated data snapshots, or unpublished local builds | No guaranteed support |

The package manifest currently reports version `0.0.2`. Confirm the release policy with a maintainer before relying on version-specific support promises.

## Reporting a Vulnerability

No private security contact is configured in this checkout.

If GitHub private vulnerability reporting is enabled for the repository, use that channel. If no private channel is available, open a public issue with only a short non-exploit summary and ask maintainers to provide a private follow-up channel.

Do not include the following in a public issue:

- Exploit payloads.
- Secrets, tokens, cookies, or private keys.
- Private user data.
- Step-by-step abuse instructions.
- Full logs containing sensitive data.

## What to Include

When safe to share privately, include:

- Affected route, file, workflow, or dependency.
- Reproduction steps.
- Impact and affected users or deployers.
- Whether the issue is actively exploitable.
- Suggested fix or mitigation, if known.

## Response Expectations

No fixed acknowledgement SLA is configured in this checkout. Maintainers should publish an acknowledgement target before accepting external vulnerability reports, and should keep reporters informed during triage, remediation, and disclosure planning. Public disclosure should wait until maintainers have investigated, prepared a fix or mitigation, and agreed on timing with the reporter when practical.

## Known Security Considerations for Deployers

- The browser app is static and has no server-side authorization layer.
- Developer unlock state is local UI state only and must not be treated as authorization.
- Public data is loaded from JSON files under `/assets/data/json/` and validated at the data-loading boundary.
- The Steam checker makes browser-side external requests through the proxy configured in `src/shared/api/steam-api.ts`.
- External Steam review data is optional and should not block the main Steam checker result.
- The local Node static server rejects path traversal, hidden path segments, and unsupported HTTP methods.
- The Vite dev server includes a hidden-path guard for dot-prefixed request paths.
- The Cloudflare Worker fetches public JSON data from `SITE_ORIGIN`, caches it briefly, and renders escaped preview metadata for `/game/*`.
- The data refresh workflow fetches public IGRS endpoints and commits generated JSON when data changes; review workflow changes carefully because generated public data is rendered by the app.

## Security Hygiene for Changes

- Do not commit secrets, tokens, cookies, or private API keys.
- Do not add unsafe HTML insertion paths.
- Keep external requests bounded by timeout and retry limits.
- Preserve path traversal guards in `ops/scripts/dev-server.js` and hidden-path guards in `config/vite.config.ts`.
- Keep user-facing errors safe and non-diagnostic.
- Use deployment-platform secrets for private configuration.
