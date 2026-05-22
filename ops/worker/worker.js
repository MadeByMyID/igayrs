const DEFAULT_SITE_ORIGIN = 'https://igrs.madeby.my.id';
const GAMES_PATH = '/assets/data/json/igrs.games.json';
const META_PATH = '/assets/data/json/igrs.meta.json';
const DATA_CACHE_TTL_MS = 300000;
const PREVIEW_BOT_RE = /(discordbot|discord|facebookexternalhit|slackbot|telegrambot|whatsapp|linkedinbot|embedly|skypeuripreview|twitterbot|pinterest|googlebot|bingbot|duckduckbot|yandexbot|crawler|spider)/i;

const RATING_COLORS = {
  7: '#22c55e',
  4: '#06b6d4',
  5: '#eab308',
  28: '#f97316',
  6: '#ef4444',
  35: '#64748b',
};

let dataCache = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const siteOrigin = normalizeOrigin(env?.SITE_ORIGIN || DEFAULT_SITE_ORIGIN);
    const route = parseGameRoute(url.pathname, url.searchParams);

    if (!route) {
      return notFound();
    }

    if (route.kind === 'oembed') {
      return serveOEmbed(siteOrigin, route.id, env);
    }

    if (isPreviewBot(request.headers.get('user-agent') || '')) {
      return servePreviewPage(siteOrigin, route.id, env);
    }

    return Response.redirect(`${siteOrigin}/search/#${route.id}`, 302);
  },
};

function parseGameRoute(pathname, searchParams) {
  if (pathname === '/game' || pathname === '/game/') {
    const id = Number(searchParams.get('id'));
    if (Number.isFinite(id) && id > 0) return { kind: 'detail', id };
    return null;
  }

  const match = pathname.match(/^\/game\/(\d+)(?:\/(oembed))?\/?$/);
  if (!match) return null;

  const id = Number(match[1]);
  if (!Number.isFinite(id) || id <= 0) return null;

  if (match[2] === 'oembed') {
    return { kind: 'oembed', id };
  }

  return { kind: 'detail', id };
}

function isPreviewBot(userAgent) {
  return PREVIEW_BOT_RE.test(userAgent);
}

async function servePreviewPage(siteOrigin, id, env) {
  const data = await loadGameData(siteOrigin, env);
  const game = data.gamesById.get(id);

  if (!game) {
    return htmlResponse(renderNotFoundPage(siteOrigin, id), 404, false);
  }

  const ratingId = game.ratings?.[0];
  const rating = ratingId !== undefined ? data.meta.ratings?.[String(ratingId)] : undefined;
  const descriptors = (game.descriptors || [])
    .map((descriptorId) => data.meta.descriptors?.[String(descriptorId)])
    .filter(Boolean)
    .map((descriptor) => descriptor.nameEn || descriptor.nameId || 'Unknown');

  const ratingText = rating?.name || (ratingId !== undefined ? `ID ${ratingId}` : 'Unknown');
  const descriptorText = descriptors.length ? descriptors.join(', ') : 'None';
  const publisherText = game.publisherName || 'Unknown publisher';
  const yearText = game.releaseYear || 'Unknown year';
  const shortDescription = truncate(normalizeWhitespace(game.description || 'No description available.'), 170);
  const description = `${shortDescription}\n\nRating: ${ratingText}\nDescriptors: ${descriptorText}`;
  const imageUrl = ratingId !== undefined
    ? `${siteOrigin}/assets/data/images/ratings/${ratingId}.png`
    : `${siteOrigin}/assets/data/images/favicon.svg`;
  const shareUrl = `${siteOrigin}/search/#${id}`;
  const pageUrl = `${siteOrigin}/game/${id}`;
  const oembedUrl = `${siteOrigin}/game/${id}/oembed`;
  const providerText = 'Data provided by IGRS.id';
  const authorText = `${publisherText} - ${yearText}`;
  const color = getRatingColor(ratingId);

  return htmlResponse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(game.name)}</title>
  <link rel="canonical" href="${escapeAttr(pageUrl)}">
  <link type="application/json+oembed" href="${escapeAttr(oembedUrl)}" />
  <meta name="author" content="${escapeAttr(authorText)}">
  <meta name="theme-color" content="${color}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttr(game.name)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${escapeAttr(shareUrl)}">
  <meta property="og:image" content="${escapeAttr(imageUrl)}">
  <meta property="og:image:alt" content="${escapeAttr(`${game.name} - ${ratingText}`)}">
  <meta property="og:site_name" content="${escapeAttr(providerText)}">
  <meta property="article:author" content="${escapeAttr(authorText)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeAttr(game.name)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <meta name="twitter:image" content="${escapeAttr(imageUrl)}">
  <script>
    window.location.replace(${JSON.stringify(shareUrl)});
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${escapeAttr(shareUrl)}">
  </noscript>
</head>
<body>
  <p>${escapeHtml(game.name)} • ${escapeHtml(authorText)}</p>
</body>
</html>`, 200, false);
}

async function serveOEmbed(siteOrigin, id, env) {
  const data = await loadGameData(siteOrigin, env);
  const game = data.gamesById.get(id);

  if (!game) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const payload = {
    version: '1.0',
    type: 'link',
    title: game.name || 'Unknown title',
    author_name: `${game.publisherName || 'Unknown publisher'} - ${game.releaseYear || 'Unknown year'}`,
    provider_name: 'Data provided by IGRS.id',
    provider_url: 'https://igrs.id',
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json+oembed; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}

async function loadGameData(siteOrigin, env) {
  const key = dataCacheKey(siteOrigin, env);
  const now = Date.now();
  if (dataCache?.key === key && dataCache.expiresAt > now) {
    return dataCache.promise;
  }

  const promise = fetchGameData(siteOrigin, env).catch((error) => {
    if (dataCache?.promise === promise) dataCache = null;
    throw error;
  });
  dataCache = {
    key,
    expiresAt: now + DATA_CACHE_TTL_MS,
    promise,
  };
  return promise;
}

async function fetchGameData(siteOrigin, env) {
  const [gamesRes, metaRes] = await Promise.all([
    fetch(resolveUrl(siteOrigin, env?.GAMES_PATH || GAMES_PATH), { headers: { 'User-Agent': 'IGRS-Preview-Worker/1.0' } }),
    fetch(resolveUrl(siteOrigin, env?.META_PATH || META_PATH), { headers: { 'User-Agent': 'IGRS-Preview-Worker/1.0' } }),
  ]);

  if (!gamesRes.ok || !metaRes.ok) {
    throw new Error(`Failed to load IGRS data (${gamesRes.status}/${metaRes.status})`);
  }

  const [games, meta] = await Promise.all([gamesRes.json(), metaRes.json()]);
  return buildGameData(games, meta);
}

function dataCacheKey(siteOrigin, env) {
  return [
    siteOrigin,
    env?.GAMES_PATH || GAMES_PATH,
    env?.META_PATH || META_PATH,
  ].join('|');
}

function buildGameData(games, meta) {
  const gameList = Array.isArray(games) ? games : [];
  const gamesById = new Map();
  for (const game of gameList) {
    if (!Number.isFinite(game?.id) || gamesById.has(game.id)) continue;
    gamesById.set(game.id, game);
  }
  return { games: gameList, gamesById, meta };
}

function getRatingColor(ratingId) {
  return RATING_COLORS[ratingId] || '#64748b';
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, limit) {
  const text = normalizeWhitespace(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function normalizeOrigin(origin) {
  return String(origin || DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
}

function resolveUrl(siteOrigin, path) {
  return new URL(path, siteOrigin).toString();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function htmlResponse(html, status = 200, cacheable = true) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cacheable ? 'public, max-age=300, stale-while-revalidate=3600' : 'no-store',
      'Vary': 'User-Agent',
    },
  });
}

function renderNotFoundPage(siteOrigin, id) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>IGRS game not found</title>
  <meta http-equiv="refresh" content="0; url=${escapeAttr(`${siteOrigin}/search/`)}">
</head>
<body>
  <p>Game ${escapeHtml(String(id))} was not found.</p>
</body>
</html>`;
}

function notFound() {
  return new Response('Not Found', { status: 404 });
}

