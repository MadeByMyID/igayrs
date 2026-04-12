(function () {
  'use strict';

  const I18N = {
    en: {
      'nav.ratings': 'Ratings Guide',
      'nav.search': 'Search Games',
      'nav.steamchecker': 'Steam Game Checker',
      'search.placeholder': 'Search games...',
      'search.publisher': 'Filter publisher...',
      'search.stats': '{count} games found',
      'search.stats.filtered': '{count} of {total} games',
      'loading': 'Loading database...',
      'empty.title': 'No games found',
      'empty.desc': 'Try a different search or clear filters.',
      'footer.text': 'Data scraped from',
      'footer.disclaimer': 'A MadeByMyID Project',
      'filter.rating': 'Rating',
      'filter.platform': 'Platform',
      'filter.descriptor': 'Content',
      'filter.year': 'Year',
      'filter.clear': 'Clear all filters',
      'detail.back': '← Back to list',
      'detail.publisher': 'Publisher',
      'detail.year': 'Release Year',
      'detail.platforms': 'Platforms',
      'detail.rating': 'Age Rating',
      'detail.descriptors': 'Content Flags',
      'detail.video': 'Video',
      'detail.ingame': 'In-Game',
      'detail.share': '☍  Copy Link',
      'detail.openIgrs': 'Open in IGRS.id',
      'detail.searchGoogle': '🔍︎  Search on Google',
      'detail.copied': 'Copied!',
      'detail.noDesc': 'No description available.',
      'detail.noDescriptors': 'No content descriptors',
      'card.viewDetail': 'View Detail ›',
      'ratings.title': 'Age Ratings Guide',
      'ratings.subtitle': 'The Indonesian Game Rating System (IGRS) classifies games into age categories based on content criteria.',
      'descriptors.title': 'Content Descriptors',
      'descriptors.subtitle': 'Descriptors indicate specific types of content present in a game.',
      'steamchecker.title': 'Steam Game Checker',
      'steamchecker.subtitle': 'Compare Steam data with IGRS.',
      'steamchecker.appid': 'App ID',
      'steamchecker.appid.placeholder': 'Enter a Steam app ID, like 3557620',
      'steamchecker.check': 'Check Steam game',
      'steamchecker.loading': 'Checking Steam details...',
      'steamchecker.empty': 'Enter a Steam app ID to inspect.',
      'steamchecker.error.invalid': 'Enter a valid numeric Steam app ID.',
      'steamchecker.error.notfound': 'Steam did not return a game for that app ID.',
      'steamchecker.error.load': 'Unable to load Steam data.',
      'steamchecker.reference': 'From IGRS DB',
      'steamchecker.steam': 'Steam rating',
      'steamchecker.ours': 'Our checker',
      'steamchecker.localMatch': 'Matched in local IGRS DB',
      'steamchecker.noMatch': 'No local IGRS match found',
      'steamchecker.generated': 'Steam generated this rating',
      'steamchecker.manual': 'Manual descriptor mapping',
      'steamchecker.generatedFlag': 'rating_generated',
      'steamchecker.requiredAge': 'Required age',
      'steamchecker.banned': 'Banned',
      'steamchecker.descriptors': 'Content descriptors',
      'steamchecker.mappedDescriptors': 'Mapped IGRS descriptors',
      'steamchecker.rawDescriptorIds': 'Steam descriptor IDs',
      'steamchecker.rawNotes': 'Steam notes',
      'steamchecker.noDescriptors': 'No content descriptors from Steam.',
      'steamchecker.noSteamRating': 'No Steam IGRS data.',
      'steamchecker.noManualMapping': 'No manual IGRS mapping for these Steam descriptors.',
      'steamchecker.noLocalRating': 'No matching IGRS record in the local database.',
      'steamchecker.unknown': 'Unknown',
      'page.prev': '‹ Prev',
      'page.next': 'Next ›',
      'page.jump': 'Jump to page',
      'page.go': 'Go',
      'home.title': 'Indonesian <span style="color: var(--primary)">Gay</span>me<br>Rating System',
      'home.subtitle': 'Unofficial open database of games in the IGRS registry. But the backend isnt slow.',
      'home.stat.games': 'Games',
      'home.stat.publishers': 'Publishers',
      'home.stat.platforms': 'Platforms',
      'home.stat.updated': 'Last Updated',
      'home.cta.search': 'Search Games',
      'home.cta.ratings': 'View Ratings Guide',
      'sidebar.rating': 'Rating',
      'sidebar.descriptor': 'Descriptor',
      'sidebar.platform': 'Platform',
      'steamchecker.viewSteam': 'View on Steam',
      'steamchecker.release': 'Release',
      'steamchecker.support': 'Support',
      'steamchecker.by': 'by',
    },
    id: {
      'nav.ratings': 'Panduan Rating',
      'nav.search': 'Cari Game',
      'nav.steamchecker': 'Steam Game Checker',
      'search.placeholder': 'Cari game...',
      'search.publisher': 'Filter penerbit...',
      'search.stats': '{count} game ditemukan',
      'search.stats.filtered': '{count} dari {total} game',
      'loading': 'Memuat database...',
      'empty.title': 'Tidak ada game ditemukan',
      'empty.desc': 'Coba pencarian lain atau hapus filter.',
      'footer.text': 'Data dari',
      'footer.disclaimer': 'Sebuah proyek dari MadeByMyID',
      'filter.rating': 'Rating',
      'filter.platform': 'Platform',
      'filter.descriptor': 'Konten',
      'filter.year': 'Tahun',
      'filter.clear': 'Hapus semua filter',
      'detail.back': '← Kembali ke daftar',
      'detail.publisher': 'Penerbit',
      'detail.year': 'Tahun Rilis',
      'detail.platforms': 'Platform',
      'detail.rating': 'Rating Usia',
      'detail.descriptors': 'Deskriptor Konten',
      'detail.video': 'Video',
      'detail.ingame': 'Dalam Game',
      'detail.share': '☍  Salin Link',
      'detail.openIgrs': 'Buka di IGRS.id',
      'detail.searchGoogle': '🔍︎  Cari di Google',
      'detail.copied': 'Tersalin!',
      'detail.noDesc': 'Tidak ada deskripsi.',
      'detail.noDescriptors': 'Tidak ada deskriptor konten',
      'card.viewDetail': 'Lihat Detail ›',
      'ratings.title': 'Panduan Rating Usia',
      'ratings.subtitle': 'Indonesian Game Rating System (IGRS) mengklasifikasikan game ke dalam berbagai kategori usia berdasarkan kriteria konten.',
      'descriptors.title': 'Deskriptor Konten',
      'descriptors.subtitle': 'Deskriptor menunjukkan jenis konten tertentu yang ada dalam game.',
      'steamchecker.title': 'Steam Game Checker',
      'steamchecker.subtitle': 'Bandingkan data Steam dengan IGRS.',
      'steamchecker.appid': 'App ID',
      'steamchecker.appid.placeholder': 'Masukkan app ID Steam, misalnya 3557620',
      'steamchecker.check': 'Cek game Steam',
      'steamchecker.loading': 'Memeriksa detail Steam...',
      'steamchecker.empty': 'Masukkan app ID Steam untuk diperiksa.',
      'steamchecker.error.invalid': 'Masukkan app ID Steam numerik yang valid.',
      'steamchecker.error.notfound': 'Steam tidak mengembalikan game untuk app ID itu.',
      'steamchecker.error.load': 'Tidak dapat memuat data Steam.',
      'steamchecker.reference': 'Dari DB IGRS',
      'steamchecker.steam': 'Rating Steam',
      'steamchecker.ours': 'Pemeriksa kami',
      'steamchecker.localMatch': 'Cocok di basis data IGRS lokal',
      'steamchecker.noMatch': 'Tidak ada kecocokan IGRS lokal',
      'steamchecker.generated': 'Steam yang menghasilkan rating ini',
      'steamchecker.manual': 'Pemetaan deskriptor manual',
      'steamchecker.generatedFlag': 'rating_generated',
      'steamchecker.requiredAge': 'Usia wajib',
      'steamchecker.banned': 'Diblokir',
      'steamchecker.descriptors': 'Deskriptor konten',
      'steamchecker.mappedDescriptors': 'Deskriptor IGRS yang dipetakan',
      'steamchecker.rawDescriptorIds': 'ID deskriptor Steam',
      'steamchecker.rawNotes': 'Catatan Steam',
      'steamchecker.noDescriptors': 'Tidak ada deskriptor konten dari Steam.',
      'steamchecker.noSteamRating': 'Tidak ada data IGRS dari Steam.',
      'steamchecker.noManualMapping': 'Tidak ada pemetaan IGRS manual untuk deskriptor Steam ini.',
      'steamchecker.noLocalRating': 'Tidak ada data IGRS yang cocok di basis data lokal.',
      'steamchecker.unknown': 'Tidak diketahui',
      'page.prev': '‹ Sblm',
      'page.next': 'Slnjt ›',
      'page.jump': 'Loncat ke halaman',
      'page.go': 'Buka',
      'home.title': 'Indonesian <span style="color: var(--primary)">Gay</span>me<br>Rating System',
      'home.subtitle': 'Database terbuka tidak resmi untuk game yang terdaftar di IGRS. Tapi gak lemot backendnya.',
      'home.stat.games': 'Game',
      'home.stat.publishers': 'Penerbit',
      'home.stat.platforms': 'Platform',
      'home.stat.updated': 'Update Terakhir',
      'home.cta.search': 'Cari Game',
      'home.cta.ratings': 'Lihat Panduan Rating',
      'sidebar.rating': 'Rating',
      'sidebar.descriptor': 'Deskriptor',
      'sidebar.platform': 'Platform',
      'steamchecker.viewSteam': 'Lihat di Steam',
      'steamchecker.release': 'Rilis',
      'steamchecker.support': 'Dukungan',
      'steamchecker.by': 'oleh',
    }
  };

  let lang = localStorage.getItem('igrs-lang') || 'en';
  let meta = null;
  let games = null;
  let steamMeta = null;

  let activeRatings = new Set();
  let activePlatforms = new Set();
  let activeDescriptors = new Set();
  let activeYears = new Set();

  const PER_PAGE = 30;
  let currentPage = 1;
  let currentDetailId = null;
  let lastListScrollY = 0;
  let filterStates = null;

  const RATING_ORDER = [7, 4, 5, 28, 6, 35];

  // toggle lang x times to reveal hidden fields
  const SECRET_KEY = 'igrs-dev';
  let langToggleCount = parseInt(localStorage.getItem('igrs-ltc') || '0', 10);
  function isUnlocked() { return localStorage.getItem(SECRET_KEY) === '1'; }
  function checkUnlock() {
    langToggleCount++;
    localStorage.setItem('igrs-ltc', String(langToggleCount));
    if (langToggleCount >= 18 && !isUnlocked()) {
      localStorage.setItem(SECRET_KEY, '1');
      console.log('%cDeveloper fields unlocked', 'color:#22c55e;font-weight:bold');
    }
  }

  const IMG_RATING = id => `data/images/ratings/${id}.png`;
  const DESC_EXT = {};
  const IMG_DESCRIPTOR = id => `data/images/descriptors/cc-${id}.${DESC_EXT[id] || 'png'}`;

  async function loadData() {
    const [metaRes, gamesRes, steamMetaRes] = await Promise.all([
      fetch('data/json/igrs.meta.json'),
      fetch('data/json/igrs.games.json'),
      fetch('data/json/steam.meta.json')
    ]);
    meta = await metaRes.json();
    games = await gamesRes.json();
    try {
      steamMeta = await steamMetaRes.json();
    } catch {
      steamMeta = { contentDescriptors: {} };
    }
  }

  function fuzzyScore(query, text) {
    if (!query || !text) return 0;
    const q = query.toLowerCase(), t = text.toLowerCase();
    if (t === q) return 100;
    if (t.startsWith(q)) return 90;
    const idx = t.indexOf(q);
    if (idx !== -1) return (idx === 0 || t[idx - 1] === ' ' || t[idx - 1] === '-') ? 80 : 70;
    const qw = q.split(/\s+/), tw = t.split(/\s+/);
    let m = 0;
    for (const w of qw) { if (tw.some(x => x.startsWith(w))) m++; }
    if (m === qw.length) return 60;
    if (m > 0) return 40 + (m / qw.length) * 15;
    let qi = 0, cb = 0, lm = -2;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) { if (i === lm + 1) cb += 5; lm = i; qi++; }
    }
    if (qi === q.length) return 20 + (q.length / t.length) * 15 + cb;
    return 0;
  }

  function searchAndFilter() {
    const gq = (document.getElementById('search-input')?.value || '').trim();
    const pq = (document.getElementById('publisher-input')?.value || '').trim();
    let results = [];
    for (const game of games) {
      let score = 0;
      if (gq) { const s = fuzzyScore(gq, game.name); if (s <= 15) continue; score = s; }
      if (pq) { const s = fuzzyScore(pq, game.publisherName); if (s <= 15) continue; score = Math.max(score, s * 0.8); }
      if (activeRatings.size > 0 && ![...activeRatings].some(r => game.ratings.includes(r))) continue;
      if (activePlatforms.size > 0 && ![...activePlatforms].every(p => game.platformsName.includes(p))) continue;
      if (activeDescriptors.size > 0 && ![...activeDescriptors].every(d => game.descriptors.includes(d))) continue;
      if (activeYears.size > 0 && !activeYears.has(String(game.releaseYear))) continue;
      results.push({ game, score });
    }
    if (gq || pq) results.sort((a, b) => b.score - a.score);
    return results;
  }

  function t(k) { return I18N[lang]?.[k] ?? I18N.en[k] ?? k; }
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function stripHtml(value) {
    if (!value) return '';
    const d = document.createElement('div');
    d.innerHTML = String(value);
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function normalizeName(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  function hl(text, q) {
    if (!q || !q.trim()) return esc(text);
    return esc(text).replace(new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  function rname(id) { return meta.ratings[id]?.name || '?'; }
  function rweight(id) { return meta.ratings[id]?.weight || 0; }
  function rtitle(id) { const r = meta.ratings[id]; return r ? (lang === 'id' ? r.titleId : r.titleEn) : ''; }
  function rcontent(id) { const r = meta.ratings[id]; return r ? (lang === 'id' ? r.contentId : r.contentEn) : ''; }
  function dname(id) { const d = meta.descriptors[id]; return d ? (lang === 'id' ? d.nameId : d.nameEn) : '?'; }
  function parseSteamAppId(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^\d+$/.test(text)) return text;

    const patterns = [
      /steamcommunity\.com\/app\/(\d+)/i,
      /store\.steampowered\.com\/app\/(\d+)/i,
      /store\.steampowered\.com\/agecheck\/app\/(\d+)/i,
      /[?&]appid=(\d+)/i,
      /[?&]appids=(\d+)/i,
      /\/app\/(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1];
    }
    return '';
  }
  function findGameByName(name) {
    if (!games?.length || !name) return null;
    const normalized = normalizeName(name);
    let fallback = null;
    let fallbackScore = 0;
    for (const game of games) {
      const candidate = normalizeName(game.name);
      if (candidate === normalized) return game;
      const score = fuzzyScore(normalized, candidate);
      if (score > fallbackScore) {
        fallbackScore = score;
        fallback = game;
      }
    }
    return fallbackScore >= 70 ? fallback : null;
  }
  function parseSteamRatingFlag(value) {
    return String(value) === '1' || value === true;
  }
  function steamRatingToIgrsId(steamRating) {
    const rating = String(steamRating?.rating || '').trim().toUpperCase();
    if (!rating) return null;
    if (rating === 'BANNED' || parseSteamRatingFlag(steamRating?.banned)) return 35;

    const byRating = {
      '0': 7,
      '3': 7,
      '3+': 7,
      '7': 4,
      '7+': 4,
      '13': 5,
      '13+': 5,
      '15': 28,
      '15+': 28,
      '18': 6,
      '18+': 6,
      'RC': 35
    };

    if (byRating[rating]) return byRating[rating];
    const age = Number(steamRating?.required_age);
    if (age >= 18) return 6;
    if (age >= 15) return 28;
    if (age >= 13) return 5;
    if (age >= 7) return 4;
    if (age >= 3) return 7;
    return null;
  }
  function getSteamDescriptorMeta(id) {
    return steamMeta?.contentDescriptors?.[String(id)] || null;
  }
  function computeSteamChecker(steamGame) {
    const descriptorIds = Array.isArray(steamGame?.content_descriptors?.ids)
      ? steamGame.content_descriptors.ids.map(id => Number(id)).filter(Number.isFinite)
      : [];
    const mappedDescriptors = [];
    const mappedDescriptorIds = [];
    let computedRatingId = 7;

    for (const descriptorId of descriptorIds) {
      const descriptorMeta = getSteamDescriptorMeta(descriptorId);
      if (!descriptorMeta) continue;
      mappedDescriptors.push({ id: descriptorId, ...descriptorMeta });
      for (const igrsId of descriptorMeta.igrsDescriptorIds || []) {
        const numericId = Number(igrsId);
        if (Number.isFinite(numericId) && !mappedDescriptorIds.includes(numericId)) {
          mappedDescriptorIds.push(numericId);
        }
      }
      if (descriptorMeta.ratingId && rweight(descriptorMeta.ratingId) > rweight(computedRatingId)) {
        computedRatingId = descriptorMeta.ratingId;
      }
    }

    return { descriptorIds, mappedDescriptors, mappedDescriptorIds, computedRatingId };
  }
  function renderRatingBadge(ratingId) {
    if (!meta?.ratings?.[ratingId]) {
      return `<span class="steam-rating-badge steam-rating-badge-muted">${esc(t('steamchecker.unknown'))}</span>`;
    }
    return `<img class="steam-rating-img" src="${IMG_RATING(ratingId)}" alt="${esc(rname(ratingId))}" loading="lazy">`;
  }
  function steamRequiredAgeLabel(steamRating) {
    const requiredAge = steamRating?.required_age;
    if (requiredAge === undefined || requiredAge === null || requiredAge === '') return t('steamchecker.unknown');
    const ageText = String(requiredAge);
    const mappedId = steamRatingToIgrsId(steamRating);
    return mappedId ? rname(mappedId) : ageText;
  }
  function renderDescriptorIcons(ids, emptyKey = 'detail.noDescriptors') {
    const cleanIds = [...new Set((ids || []).map(id => Number(id)).filter(Number.isFinite))];
    if (!cleanIds.length) return `<div class="detail-no-descriptors">${esc(t(emptyKey))}</div>`;
    return `
      <div class="descriptor-icons">
        ${cleanIds.map(id => `
          <span class="descriptor-icon">
            <img src="${IMG_DESCRIPTOR(id)}" alt="${esc(dname(id))}" loading="lazy">
            <span class="tooltip">${esc(dname(id))}</span>
          </span>
        `).join('')}
      </div>`;
  }
  function steamIgrsDescriptorIdsFromText(text) {
    if (!text || !meta?.descriptors) return [];
    const lines = String(text)
      .split(/\r?\n/g)
      .map(line => normalizeName(line))
      .filter(Boolean);
    if (!lines.length) return [];

    const ids = [];
    for (const line of lines) {
      for (const [id, descriptor] of Object.entries(meta.descriptors)) {
        const variants = [descriptor?.nameId, descriptor?.nameEn]
          .map(value => normalizeName(value))
          .filter(Boolean);
        if (!variants.length) continue;
        if (variants.some(variant => variant === line || variant.includes(line) || line.includes(variant))) {
          const numericId = Number(id);
          if (Number.isFinite(numericId) && !ids.includes(numericId)) ids.push(numericId);
        }
      }
    }
    return ids;
  }
  function formatLocalDateTime24(isoString) {
    if (!isoString) return '-';
    const dt = new Date(isoString);
    if (Number.isNaN(dt.getTime())) return '-';
    const datePart = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dt);
    const timePart = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(dt);
    return `${datePart} ${timePart}`;
  }

  function toggle(set, val) { set.has(val) ? set.delete(val) : set.add(val); }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  function renderCard(game, gq, pq) {
    const rid = game.ratings[0];
    const platforms = game.platformsName.join(' · ');
    return `
      <article class="game-card fade-in" data-id="${game.id}">
        <div class="game-card-top">
          <div class="game-card-info">
            <div class="game-title">${hl(game.name, gq)}</div>
            <div class="game-publisher">${hl(game.publisherName, pq)}</div>
          </div>
          <div class="game-card-right">
            <span class="rating-badge" data-rating="${rid}">${esc(rname(rid))}</span>
            <button class="view-detail" data-id="${game.id}" type="button">${t('card.viewDetail')}</button>
          </div>
        </div>
        <div class="game-card-meta">
          <div class="game-meta-group">
            <span class="game-meta-label">${t('detail.year')}</span>
            <span class="game-meta-value">${game.releaseYear}</span>
          </div>
          <div class="game-meta-group">
            <span class="game-meta-label">${t('detail.platforms')}</span>
            <span class="game-meta-value">${esc(platforms)}</span>
          </div>
        </div>
      </article>`;
  }

  function renderFilterSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const ratingCounts = {};
    const platformCounts = {};
    const descriptorCounts = {};
    const yearCounts = {};
    games.forEach(g => {
      g.ratings.forEach(r => { ratingCounts[r] = (ratingCounts[r] || 0) + 1; });
      g.platformsName.forEach(p => { platformCounts[p] = (platformCounts[p] || 0) + 1; });
      g.descriptors.forEach(d => { descriptorCounts[d] = (descriptorCounts[d] || 0) + 1; });
      yearCounts[g.releaseYear] = (yearCounts[g.releaseYear] || 0) + 1;
    });

    const topP = ['PC', 'Android', 'iOS', 'PlayStation 5', 'Nintendo Switch 2', 'Nintendo Switch', 'Web Based'];
    const allPlatforms = [...new Set(games.flatMap(g => g.platformsName))];
    const platforms = [...topP.filter(p => allPlatforms.includes(p)), ...allPlatforms.filter(p => !topP.includes(p)).sort()];
    const descriptorIds = [...new Set(games.flatMap(g => g.descriptors))].sort((a, b) => dname(a).localeCompare(dname(b)));
    const years = [...new Set(games.map(g => g.releaseYear))].sort((a, b) => b - a);
    const hasActive = activeRatings.size + activePlatforms.size + activeDescriptors.size + activeYears.size > 0;

    if (!filterStates) {
      const initC = window.innerWidth <= 900;
      filterStates = { r: initC, p: initC, d: initC, y: initC };
    }

    sidebar.innerHTML = `
      <div class="filter-panel${filterStates.r ? ' collapsed' : ''}" id="filter-rating">
        <div class="filter-panel-header">${t('filter.rating')} <span class="toggle-icon">▼</span></div>
        <div class="filter-panel-body">
          ${RATING_ORDER.filter(id => meta.ratings[id]).map(id => `
            <label class="filter-checkbox">
              <input type="checkbox" data-rating="${id}" ${activeRatings.has(id) ? 'checked' : ''}>
              ${esc(rname(id))}
              <span class="count">${ratingCounts[id] || 0}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="filter-panel${filterStates.p ? ' collapsed' : ''}" id="filter-platform">
        <div class="filter-panel-header">${t('filter.platform')} <span class="toggle-icon">▼</span></div>
        <div class="filter-panel-body">
          ${platforms.map(p => `
            <label class="filter-checkbox">
              <input type="checkbox" data-platform="${esc(p)}" ${activePlatforms.has(p) ? 'checked' : ''}>
              ${esc(p)}
              <span class="count">${platformCounts[p] || 0}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="filter-panel${filterStates.d ? ' collapsed' : ''}" id="filter-descriptor">
        <div class="filter-panel-header">${t('filter.descriptor')} <span class="toggle-icon">▼</span></div>
        <div class="filter-panel-body">
          ${descriptorIds.map(id => `
            <label class="filter-checkbox">
              <input type="checkbox" data-descriptor="${id}" ${activeDescriptors.has(id) ? 'checked' : ''}>
              ${esc(dname(id))}
              <span class="count">${descriptorCounts[id] || 0}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="filter-panel${filterStates.y ? ' collapsed' : ''}" id="filter-year">
        <div class="filter-panel-header">${t('filter.year')} <span class="toggle-icon">▼</span></div>
        <div class="filter-panel-body">
          ${years.map(year => `
            <label class="filter-checkbox">
              <input type="checkbox" data-year="${year}" ${activeYears.has(String(year)) ? 'checked' : ''}>
              ${esc(String(year))}
              <span class="count">${yearCounts[year] || 0}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <button class="filter-clear-btn${hasActive ? '' : ' hidden'}" id="filter-clear" type="button">${t('filter.clear')}</button>
    `;

    sidebar.querySelectorAll('[data-rating]').forEach(cb => {
      cb.addEventListener('change', () => { toggle(activeRatings, parseInt(cb.dataset.rating)); currentPage = 1; renderFilterSidebar(); renderResults(); });
    });
    sidebar.querySelectorAll('[data-platform]').forEach(cb => {
      cb.addEventListener('change', () => { toggle(activePlatforms, cb.dataset.platform); currentPage = 1; renderFilterSidebar(); renderResults(); });
    });
    sidebar.querySelectorAll('[data-descriptor]').forEach(cb => {
      cb.addEventListener('change', () => { toggle(activeDescriptors, parseInt(cb.dataset.descriptor)); currentPage = 1; renderFilterSidebar(); renderResults(); });
    });
    sidebar.querySelectorAll('[data-year]').forEach(cb => {
      cb.addEventListener('change', () => { toggle(activeYears, cb.dataset.year); currentPage = 1; renderFilterSidebar(); renderResults(); });
    });
    sidebar.querySelectorAll('.filter-panel-header').forEach((h, i) => {
      const keys = ['r', 'p', 'd', 'y'];
      h.addEventListener('click', () => {
        filterStates[keys[i]] = !filterStates[keys[i]];
        h.parentElement.classList.toggle('collapsed');
      });
    });
    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      activeRatings.clear(); activePlatforms.clear(); activeDescriptors.clear(); activeYears.clear();
      currentPage = 1; renderFilterSidebar(); renderResults();
    });
  }

  function renderDetailSidebar(game) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const rid = game.ratings[0];
    const descriptors = game.descriptors;

    sidebar.innerHTML = `
      <div class="detail-sidebar fade-in">
        <div class="detail-sidebar-section">
          <div class="detail-sidebar-label">${t('sidebar.rating')}</div>
          <a href="ratings/" class="rating-icon-link" title="${esc(rtitle(rid))}">
            <img src="${IMG_RATING(rid)}" alt="${esc(rname(rid))}" loading="lazy">
          </a>
        </div>
        <div class="detail-sidebar-section">
          <div class="detail-sidebar-label">${t('sidebar.descriptor')}</div>
          ${descriptors.length > 0 ? `
            <div class="descriptor-icons">
              ${descriptors.map(d => `
                <span class="descriptor-icon">
                  <img src="${IMG_DESCRIPTOR(d)}" alt="${esc(dname(d))}" loading="lazy">
                  <span class="tooltip">${esc(dname(d))}</span>
                </span>
              `).join('')}
            </div>
          ` : `<span class="detail-no-descriptors">${t('detail.noDescriptors')}</span>`}
        </div>
        <div class="detail-sidebar-section">
          <div class="detail-sidebar-label">${t('sidebar.platform')}</div>
          <div class="platform-tags">
            ${game.platformsName.map(p => `<span class="tag">${esc(p)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderResults() {
    const list = document.getElementById('game-list');
    const stats = document.getElementById('search-stats');
    const pag = document.getElementById('pagination');
    if (!list || !games) return;

    const gq = (document.getElementById('search-input')?.value || '').trim();
    const pq = (document.getElementById('publisher-input')?.value || '').trim();
    const all = searchAndFilter();

    const total = Math.max(1, Math.ceil(all.length / PER_PAGE));
    if (currentPage > total) currentPage = total;
    const start = (currentPage - 1) * PER_PAGE;
    const page = all.slice(start, start + PER_PAGE);

    if (all.length === 0) {
      list.innerHTML = `<div class="empty-state fade-in"><div class="empty-state-icon">🎮</div><div class="empty-state-title">${t('empty.title')}</div><div class="empty-state-desc">${t('empty.desc')}</div></div>`;
    } else {
      list.innerHTML = page.map(r => renderCard(r.game, gq, pq)).join('');
      list.querySelectorAll('.view-detail').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); showDetail(parseInt(btn.dataset.id)); });
      });
      list.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => showDetail(parseInt(card.dataset.id)));
      });
    }

    if (stats) {
      const filtered = activeRatings.size + activePlatforms.size + activeDescriptors.size + activeYears.size > 0 || gq || pq;
      stats.innerHTML = filtered
        ? t('search.stats.filtered').replace('{count}', `<strong>${all.length}</strong>`).replace('{total}', `<strong>${games.length}</strong>`)
        : t('search.stats').replace('{count}', `<strong>${games.length}</strong>`);
    }
    if (pag) renderPagination(pag, total);
  }

  function showDetail(id, options = {}) {
    const { updateHistory = true } = options;
    const game = games.find(g => g.id === id);
    if (!game) return;

    if (updateHistory) {
      lastListScrollY = window.scrollY;
      history.pushState({ detailId: id, listScrollY: lastListScrollY }, '', `search#${id}`);
    }

    currentDetailId = id;

    const dp = document.getElementById('detail-page');
    const lv = document.getElementById('list-view');
    const searchSection = document.querySelector('.search-section');

    const appLayout = document.querySelector('.app-layout');

    if (lv) lv.classList.add('hidden');
    if (searchSection) searchSection.style.display = 'none';
    if (appLayout) appLayout.classList.add('detail-active');
    dp.classList.add('active');

    const unlocked = isUnlocked();

    let gridRows = `
      <span class="detail-label">${t('detail.publisher')}</span>
      <span class="detail-value">${esc(game.publisherName)}</span>
      <span class="detail-label">${t('detail.year')}</span>
      <span class="detail-value">${game.releaseYear}</span>
    `;

    if (unlocked) {
      if (game.videoUrl) {
        gridRows += `
          <span class="detail-label">${t('detail.video')}</span>
          <span class="detail-value"><a href="${esc(game.videoUrl)}" target="_blank" rel="noopener">${esc(game.videoUrl)}</a></span>
        `;
      }
      if (game.inGameUrl) {
        gridRows += `
          <span class="detail-label">${t('detail.ingame')}</span>
          <span class="detail-value"><a href="${esc(game.inGameUrl)}" target="_blank" rel="noopener">${esc(game.inGameUrl)}</a></span>
        `;
      }
    }

    dp.innerHTML = `
      <button class="detail-back" id="detail-back" type="button">${t('detail.back')}</button>
      <div class="detail-card fade-in">
        <div class="detail-header">
          <div>
            <div class="detail-title">${esc(game.name)}</div>
            <div class="detail-publisher">${esc(game.publisherName)}</div>
          </div>
        </div>
        <p class="detail-description">${esc(game.description || t('detail.noDesc'))}</p>
        <div class="detail-grid">${gridRows}</div>
        <div class="detail-actions">
          <button class="detail-share-btn" id="detail-share" type="button">${t('detail.share')}</button>
          <a class="detail-link-btn" href="https://igrs.id/game-detail/${game.id}" target="_blank" rel="noopener">
            <img src="data/images/igrs.svg" alt="" aria-hidden="true">
            <span>${t('detail.openIgrs')}</span>
          </a>
          <a class="detail-link-btn" href="https://www.google.com/search?q=${encodeURIComponent(`${game.name} ${t('steamchecker.by')} ${game.publisherName}`)}" target="_blank" rel="noopener">
            <span>${t('detail.searchGoogle')}</span>
          </a>
        </div>
      </div>
    `;

    renderDetailSidebar(game);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.getElementById('detail-back').addEventListener('click', () => {
      if (history.state?.detailId === id) history.back();
      else hideDetail();
    });
    document.getElementById('detail-share').addEventListener('click', function () {
      const url = `${location.origin}/game/${game.id}`;
      navigator.clipboard.writeText(url).then(() => {
        this.textContent = t('detail.copied');
        this.classList.add('copied');
        setTimeout(() => { this.textContent = t('detail.share'); this.classList.remove('copied'); }, 2000);
      });
    });
  }

  function hideDetail() {
    const scrollY = lastListScrollY;
    currentDetailId = null;
    history.replaceState(null, '', location.pathname);

    const dp = document.getElementById('detail-page');
    const lv = document.getElementById('list-view');
    const searchSection = document.querySelector('.search-section');

    const appLayout = document.querySelector('.app-layout');

    dp.classList.remove('active');
    dp.innerHTML = '';
    if (lv) lv.classList.remove('hidden');
    if (searchSection) searchSection.style.display = '';
    if (appLayout) appLayout.classList.remove('detail-active');

    renderFilterSidebar();
    requestAnimationFrame(() => {
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => {
        root.style.scrollBehavior = previousBehavior;
      });
    });
  }

  function renderPagination(el, total) {
    if (total <= 1) { el.innerHTML = ''; return; }
    let h = `<button class="page-btn" data-p="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} type="button">${t('page.prev')}</button>`;
    h += '<div class="pagination-center">';
    let jumpInserted = false;
    let skipNextEllipsis = false;
    for (const p of pageRange(currentPage, total)) {
      if (p === '...') {
        if (skipNextEllipsis) {
          skipNextEllipsis = false;
          continue;
        }
        if (!jumpInserted) {
          h += `
            <p class="page-ellipsis">…</p>
            <form class="page-jump" id="page-jump-form">
              <input
                class="page-jump-input"
                id="page-jump-input"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="4"
                value="${currentPage}"
                aria-label="${t('page.jump')}"
              >
            </form>
            <p class="page-ellipsis">…</p>
          `;
          jumpInserted = true;
          skipNextEllipsis = true;
        } else {
          h += '<p class="page-ellipsis">…</p>';
        }
      } else {
        h += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-p="${p}" type="button">${p}</button>`;
      }
    }
    if (!jumpInserted) {
      h += `
        <form class="page-jump" id="page-jump-form">
          <input
            class="page-jump-input"
            id="page-jump-input"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            value="${currentPage}"
            aria-label="${t('page.jump')}"
          >
        </form>
      `;
    }
    h += '</div>';
    h += `<button class="page-btn" data-p="${currentPage + 1}" ${currentPage === total ? 'disabled' : ''} type="button">${t('page.next')}</button>`;
    el.innerHTML = h;
    el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return; currentPage = parseInt(b.dataset.p); renderResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));

    const jumpForm = el.querySelector('#page-jump-form');
    const jumpInput = el.querySelector('#page-jump-input');
    if (jumpForm && jumpInput) {
      jumpForm.addEventListener('submit', event => {
        event.preventDefault();
        const value = parseInt(jumpInput.value, 10);
        if (!Number.isFinite(value)) return;
        const nextPage = Math.min(total, Math.max(1, value));
        if (nextPage === currentPage) return;
        currentPage = nextPage;
        renderResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      jumpInput.addEventListener('input', () => {
        jumpInput.value = jumpInput.value.replace(/\D+/g, '');
      });
      jumpInput.addEventListener('keydown', event => {
        if (event.key === 'Escape') jumpInput.blur();
      });
    }
  }

  function pageRange(c, t) {
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    const p = [1];
    if (c > 3) p.push('...');
    for (let i = Math.max(2, c - 1); i <= Math.min(t - 1, c + 1); i++) p.push(i);
    if (c < t - 2) p.push('...');
    p.push(t);
    return p;
  }

  function handleHash() {
    const m = location.hash.match(/^#(\d+)$/);
    if (!m) {
      if (currentDetailId !== null) hideDetail();
      return;
    }
    const id = parseInt(m[1]);
    if (games && games.find(g => g.id === id)) showDetail(id, { updateHistory: false });
  }

  function renderRatingsPage() {
    const list = document.getElementById('ratings-list');
    const dg = document.getElementById('descriptor-grid');
    if (!list || !meta) return;

    list.innerHTML = RATING_ORDER.filter(id => meta.ratings[id]).map(id => {
      const r = meta.ratings[id];
      const title = lang === 'id' ? r.titleId : r.titleEn;
      const sub = lang === 'id' ? r.titleEn : r.titleId;
      const content = lang === 'id' ? r.contentId : r.contentEn;
      return `
        <div class="rating-card fade-in">
          <div class="rating-card-header">
            <img src="${IMG_RATING(id)}" alt="${esc(r.name)}" loading="lazy">
            <div>
              <div class="rating-card-title">${esc(title)}</div>
              <div class="rating-card-subtitle">${esc(sub)}</div>
            </div>
          </div>
          <div class="rating-content">${esc(content)}</div>
        </div>`;
    }).join('');

    if (dg) {
      dg.innerHTML = Object.entries(meta.descriptors)
        .sort((a, b) => (lang === 'id' ? a[1].nameId : a[1].nameEn).localeCompare(lang === 'id' ? b[1].nameId : b[1].nameEn))
        .map(([id, d]) => {
          const nm = lang === 'id' ? d.nameId : d.nameEn;
          const alt = lang === 'id' ? d.nameEn : d.nameId;
          const desc = d.description || (lang === 'id' ? 'Tidak ada deskripsi' : 'No description');
          return `
            <div class="descriptor-card fade-in">
              <img src="${IMG_DESCRIPTOR(id)}" alt="${esc(nm)}" loading="lazy">
              <div class="descriptor-card-text">
                <div class="descriptor-name">${esc(nm)}</div>
                <div class="descriptor-alt">${esc(alt)}</div>
                <div class="descriptor-desc">${esc(desc)}</div>
              </div>
            </div>`;
        }).join('');
    }
  }

  function renderSteamCheckerPage() {
    const form = document.getElementById('steam-checker-form');
    const input = document.getElementById('steam-appid-input');
    const status = document.getElementById('steam-checker-status');
    const results = document.getElementById('steam-checker-results');
    const sidebar = document.getElementById('steam-checker-sidebar');
    if (!form || !input || !status || !results || !sidebar) return;

    const params = new URLSearchParams(location.search);
    const initialAppId = params.get('appid') || '';
    if (initialAppId) input.value = parseSteamAppId(initialAppId) || initialAppId;

    function showIdle() {
      status.textContent = t('steamchecker.empty');
      results.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-title">${esc(t('steamchecker.title'))}</div>
          <div class="empty-state-desc">${esc(t('steamchecker.subtitle'))}</div>
        </div>`;
      sidebar.innerHTML = '';
    }

    function renderError(message) {
      status.textContent = message;
      results.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-title">${esc(message)}</div>
          <div class="empty-state-desc">${esc(t('steamchecker.error.load'))}</div>
        </div>`;
      sidebar.innerHTML = '';
    }

    function renderSteamCheckerResult(appId, steamGame) {
      const unlocked = isUnlocked();
      const steamRating = steamGame?.ratings?.igrs || null;
      const generated = parseSteamRatingFlag(steamRating?.rating_generated);
      const localMatch = generated ? findGameByName(steamGame?.name) : null;
      const checker = computeSteamChecker(steamGame);
      const referenceRatingId = localMatch?.ratings?.[0] || null;
      const referenceIsLocal = Boolean(localMatch);
      const steamRatingId = steamRatingToIgrsId(steamRating);
      const referenceDescriptorIds = localMatch?.descriptors || [];
      const steamRatingDescriptorIds = steamIgrsDescriptorIdsFromText(steamRating?.descriptors || '');

      const referenceCard = referenceIsLocal
        ? `
          <div class="rating-card-header">
            ${renderRatingBadge(referenceRatingId)}
            <div>
              <div class="rating-card-title">${esc(rtitle(referenceRatingId))}</div>
              <div class="rating-card-subtitle">${esc(t('steamchecker.reference'))}</div>
            </div>
          </div>
          ${renderDescriptorIcons(referenceDescriptorIds)}
        `
        : `
          <div class="detail-no-descriptors">${esc(t('steamchecker.noLocalRating'))}</div>
        `;

      const steamCard = `
        <div class="rating-card-header">
          ${renderRatingBadge(steamRatingId)}
          <div>
            <div class="rating-card-title">${esc(steamRatingId ? rtitle(steamRatingId) : t('steamchecker.noSteamRating'))}</div>
            <div class="rating-card-subtitle">${esc(generated ? t('steamchecker.generated') : t('steamchecker.noMatch'))}</div>
          </div>
        </div>
        ${renderDescriptorIcons(steamRatingDescriptorIds, 'steamchecker.noDescriptors')}
      `;

      const oursCard = `
        <div class="rating-card-header">
          ${renderRatingBadge(checker.computedRatingId)}
          <div>
            <div class="rating-card-title">${esc(rtitle(checker.computedRatingId))}</div>
            <div class="rating-card-subtitle">${esc(t('steamchecker.manual'))}</div>
          </div>
        </div>
        ${renderDescriptorIcons(checker.mappedDescriptorIds, 'steamchecker.noManualMapping')}
      `;

      const authorName = steamGame?.developers?.[0] || steamGame?.publishers?.[0] || t('steamchecker.unknown');
      const descriptionRaw = steamGame?.detailed_description || steamGame?.about_the_game || '';
      const gameDescription = stripHtml(descriptionRaw) || t('detail.noDesc');

      const steamStorageUrl = `https://store.steampowered.com/app/${appId}`;
      const steamCheckerUrl = location.href.split('?')[0] + `?appid=${appId}`;
      const supportUrl = steamGame?.support_info?.url || null;
      const releaseDate = steamGame?.release_date?.date || null;

      results.innerHTML = `
        <section class="detail-card fade-in" style="margin-bottom:1rem;">
          <div class="detail-header" style="margin-bottom:1rem;">
            <div>
              <div class="detail-title">${esc(steamGame?.name || t('steamchecker.unknown'))}</div>
              <div class="detail-publisher">${esc(authorName)}</div>
            </div>
          </div>
          <p class="detail-description" style="margin-bottom:0;">${esc(gameDescription)}</p>
        </section>
      `;

      const infoSection = `
        <div style="margin-top:1rem; font-size:0.9rem;">
          ${releaseDate ? `<div style="margin-bottom:0.5rem;"><strong>${t('steamchecker.release')}:</strong> ${esc(releaseDate)}</div>` : ''}
          ${supportUrl ? `<div style="margin-bottom:0.5rem;"><strong>${t('steamchecker.support')}:</strong> <a href="${supportUrl}" target="_blank" rel="noopener" style="color:var(--link-color); text-decoration:underline;">${esc(new URL(supportUrl).hostname)}</a></div>` : ''}
        </div>
        <div class="detail-actions" style="margin-top:1rem;">
          <button class="detail-share-btn steam-share-btn" data-share-url="${steamCheckerUrl}" type="button">${t('detail.share')}</button>
          <a class="detail-link-btn" href="${steamStorageUrl}" target="_blank" rel="noopener">
            <span>${t('steamchecker.viewSteam')}</span>
          </a>
          <a class="detail-link-btn" href="https://igrs.id/game-detail/${appId}" target="_blank" rel="noopener">
            <img src="data/images/igrs.svg" alt="" aria-hidden="true">
            <span>${t('detail.openIgrs')}</span>
          </a>
        </div>
      `;

      sidebar.innerHTML = `
        <article class="rating-card fade-in">
          <div class="rating-card-subtitle" style="margin-bottom:0.5rem;">${esc(t('steamchecker.reference'))}</div>
          ${referenceCard}
        </article>
        <article class="rating-card fade-in">
          <div class="rating-card-subtitle" style="margin-bottom:0.5rem;">${esc(t('steamchecker.steam'))}</div>
          ${steamCard}
        </article>
        <article class="rating-card fade-in">
          ${infoSection}
        </article>
        ${unlocked ? `
        <article class="rating-card fade-in">
          <div class="rating-card-subtitle" style="margin-bottom:0.5rem;">${esc(t('steamchecker.ours'))}</div>
          ${oursCard}
        </article>
        ` : ''}
      `;

      document.querySelector('.steam-share-btn')?.addEventListener('click', function () {
        const url = this.dataset.shareUrl;
        navigator.clipboard.writeText(url).then(() => {
          this.textContent = t('detail.copied');
          this.classList.add('copied');
          setTimeout(() => { this.textContent = t('detail.share'); this.classList.remove('copied'); }, 2000);
        });
      });

      status.textContent = generated && localMatch ? "" : "";
    }

    async function submitCheck(appId) {
      const trimmed = parseSteamAppId(appId);
      if (!/^\d+$/.test(trimmed)) {
        renderError(t('steamchecker.error.invalid'));
        return;
      }

      input.value = trimmed;

      status.textContent = t('steamchecker.loading');
      results.innerHTML = `
        <div class="empty-state fade-in">
          <div class="loading-spinner"></div>
          <div class="empty-state-title">${esc(t('steamchecker.loading'))}</div>
          <div class="empty-state-desc">${esc(trimmed)}</div>
        </div>`;
      sidebar.innerHTML = '';

      try {
        const response = await fetch(`https://cors.mefi.workers.dev/https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(trimmed)}`);
        const payload = await response.json();
        const steamGame = payload?.[trimmed];
        if (!steamGame?.success || !steamGame.data) {
          throw new Error(t('steamchecker.error.notfound'));
        }
        history.replaceState(null, '', `/steamchecker/?appid=${encodeURIComponent(trimmed)}`);
        renderSteamCheckerResult(trimmed, steamGame.data);
      } catch (error) {
        renderError(error?.message || t('steamchecker.error.load'));
      }
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      submitCheck(input.value);
    });

    if (initialAppId) submitCheck(initialAppId);
    else showIdle();
  }

  function renderHomePage() {
    if (!games || !meta) return;

    const statGames = document.getElementById('stat-games');
    const statPub = document.getElementById('stat-publishers');
    const statPlat = document.getElementById('stat-platforms');
    const statUpdated = document.getElementById('stat-updated');
    const heroRatings = document.getElementById('hero-ratings');

    if (statGames) statGames.textContent = games.length;
    if (statPub) statPub.textContent = new Set(games.map(g => g.publisherName)).size;
    if (statPlat) statPlat.textContent = new Set(games.flatMap(g => g.platformsName)).size;
    if (statUpdated) statUpdated.textContent = formatLocalDateTime24(meta?.meta?.generatedAt || meta?.generatedAt);

    if (heroRatings) {
      heroRatings.innerHTML = RATING_ORDER.filter(id => meta.ratings[id]).map(id =>
        `<a href="ratings/" title="${esc(rtitle(id))}"><img src="${IMG_RATING(id)}" alt="${esc(rname(id))}" loading="lazy"></a>`
      ).join('');
    }
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = t(el.dataset.i18n);
      if (val.includes('<br>') || val.includes('<')) el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));
    const ll = document.getElementById('lang-label');
    if (ll) ll.textContent = lang === 'en' ? 'ID' : 'EN';
    document.documentElement.lang = lang;
    document.body.classList.add('ready');
  }

  function initScrollTop() {
    const b = document.getElementById('scroll-top');
    if (!b) return;
    window.addEventListener('scroll', () => b.classList.toggle('visible', window.scrollY > 400), { passive: true });
    b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  async function init() {
    const isSearch = !!document.getElementById('game-list');
    const isRatings = !!document.getElementById('ratings-list');
    const isHome = !!document.getElementById('hero-stats');
    const isSteamChecker = !!document.getElementById('steam-checker-page');

    applyI18n();

    try { await loadData(); } catch (e) {
      console.error('Load failed:', e);
      const el = document.getElementById('game-list') || document.getElementById('ratings-list');
      if (el) el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Failed to load data</div><div class="empty-state-desc">${esc(e.message)}</div></div>`;
      return;
    }

    if (isHome) {
      renderHomePage();
    } else if (isRatings) {
      renderRatingsPage();
    } else if (isSteamChecker) {
      renderSteamCheckerPage();
    } else if (isSearch) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      renderFilterSidebar();
      renderResults();
      const dr = debounce(() => { currentPage = 1; renderResults(); }, 120);
      document.getElementById('search-input')?.addEventListener('input', dr);
      document.getElementById('publisher-input')?.addEventListener('input', dr);
      handleHash();
      window.addEventListener('hashchange', handleHash);
      window.addEventListener('popstate', () => {
        if (!location.hash && currentDetailId !== null) hideDetail();
      });
    }

    document.getElementById('lang-toggle')?.addEventListener('click', () => {
      lang = lang === 'en' ? 'id' : 'en';
      localStorage.setItem('igrs-lang', lang);
      checkUnlock();
      applyI18n();
      if (isHome) { renderHomePage(); }
      else if (isRatings) { renderRatingsPage(); }
      else if (isSteamChecker) { renderSteamCheckerPage(); }
      else if (isSearch) {
        if (currentDetailId !== null) showDetail(currentDetailId, { updateHistory: false });
        else { renderFilterSidebar(); renderResults(); }
      }
    });

    initScrollTop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
