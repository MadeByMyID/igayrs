# Cache Strategy

This document describes the cache header configuration for deployed assets on `igrs.madeby.my.id`.

## Overview

The site is deployed to GitHub Pages and served through Cloudflare (custom domain on the `madeby.my.id` zone). GitHub Pages does not support custom `Cache-Control` headers, so cache rules must be configured via **Cloudflare Cache Rules** in the Cloudflare dashboard.

The `public/_headers` file in this repository documents the intended cache and security header policy and can be used directly if the site is migrated to Cloudflare Pages.

## Security Headers

Because the current deployment is GitHub Pages behind Cloudflare, the baseline security headers documented in `public/_headers` must be configured in Cloudflare response-header rules or an equivalent edge rule. GitHub Pages will not read `_headers` directly.

| Header | Intended value |
|---|---|
| `Content-Security-Policy` | Allows same-origin app assets and data, Bunny Fonts styles/fonts, HTTPS images for external Steam artwork, and the configured CORS proxy for Steam API calls. |
| `Permissions-Policy` | Disables camera, microphone, and geolocation. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |

## Cache Tiers

| Asset Type | Cache-Control | Rationale |
|---|---|---|
| Hashed JS/CSS (`assets/*.js`, `assets/*.css`) | `public, max-age=31536000, immutable` | Filenames contain content hashes — when content changes, the filename changes. Safe to cache indefinitely. |
| HTML files (`*.html`) | `no-cache` | Entry points that reference hashed assets. Must revalidate on every request to pick up new asset references. |
| JSON data files (`assets/data/json/*.json`) | `public, max-age=3600, stale-while-revalidate=86400` | Game data updates periodically (via the update-igrs-db workflow). 1-hour freshness with 24-hour stale-while-revalidate balances freshness and performance. |
| i18n dictionaries (`assets/i18n/*.json`) | `public, max-age=3600, stale-while-revalidate=86400` | Translation files change infrequently. Same policy as data files. |
| Static images (`assets/data/images/*`) | `public, max-age=31536000, immutable` | Rating and descriptor images are versioned by filename. Safe to cache long-term. |

## Cloudflare Cache Rules Setup

Configure these rules in the Cloudflare dashboard under **Caching > Cache Rules** for the `madeby.my.id` zone:

### Rule 1: Immutable Hashed Assets

- **When:** Hostname equals `igrs.madeby.my.id` AND URI Path matches `/assets/*.(js|css|svg)`
- **Then:** Set Cache-Control header to `public, max-age=31536000, immutable`
- **Edge TTL:** 1 year
- **Browser TTL:** 1 year

### Rule 2: Immutable Images

- **When:** Hostname equals `igrs.madeby.my.id` AND URI Path matches `/assets/data/images/*`
- **Then:** Set Cache-Control header to `public, max-age=31536000, immutable`
- **Edge TTL:** 1 year
- **Browser TTL:** 1 year

### Rule 3: JSON Data Files (Short TTL)

- **When:** Hostname equals `igrs.madeby.my.id` AND URI Path matches `/assets/data/json/*.json`
- **Then:** Set Cache-Control header to `public, max-age=3600, stale-while-revalidate=86400`
- **Edge TTL:** 1 hour
- **Browser TTL:** 1 hour

### Rule 4: i18n Dictionaries (Short TTL)

- **When:** Hostname equals `igrs.madeby.my.id` AND URI Path matches `/assets/i18n/*.json`
- **Then:** Set Cache-Control header to `public, max-age=3600, stale-while-revalidate=86400`
- **Edge TTL:** 1 hour
- **Browser TTL:** 1 hour

### Rule 5: HTML No-Cache

- **When:** Hostname equals `igrs.madeby.my.id` AND URI Path matches `*.html` OR URI Path equals `/` OR URI Path matches `*/`
- **Then:** Set Cache-Control header to `no-cache`
- **Edge TTL:** Respect origin
- **Browser TTL:** No cache

## Why These Values?

- **31536000 seconds (1 year) + immutable**: Vite produces content-hashed filenames (e.g., `main-BArfcqLd.css`). The hash changes when content changes, so the old URL is never requested again. This is the maximum safe cache duration.

- **no-cache for HTML**: HTML files contain `<script>` and `<link>` tags referencing hashed assets. When a new build deploys, the HTML must be fresh to reference the new hashes. `no-cache` means the browser always revalidates with the server (but can use a 304 Not Modified response if unchanged).

- **3600 seconds (1 hour) for JSON data**: Game data updates via the `update-igrs-db` workflow (typically daily or less). A 1-hour TTL means users see fresh data within an hour of updates. The `stale-while-revalidate=86400` directive allows serving stale data for up to 24 hours while fetching fresh data in the background, providing instant responses even when the cache expires.

## Migration to Cloudflare Pages

If the site is migrated from GitHub Pages to Cloudflare Pages in the future, the `public/_headers` file will be automatically processed by Cloudflare Pages and no dashboard configuration is needed. The file follows the [Cloudflare Pages Headers format](https://developers.cloudflare.com/pages/configuration/headers/).
