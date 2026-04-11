(function () {
  'use strict';

  const I18N = {
    en: {
      'nav.ratings': 'Ratings Guide',
      'nav.search': 'Search Games',
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
      'page.prev': '‹ Prev',
      'page.next': 'Next ›',
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
    },
    id: {
      'nav.ratings': 'Panduan Rating',
      'nav.search': 'Cari Game',
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
      'page.prev': '‹ Sblm',
      'page.next': 'Slnjt ›',
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
    }
  };

  let lang = localStorage.getItem('igrs-lang') || 'en';
  let meta = null;
  let games = null;

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
    const [metaRes, gamesRes] = await Promise.all([
      fetch('data/json/igrs.meta.json'),
      fetch('data/json/igrs.games.json')
    ]);
    meta = await metaRes.json();
    games = await gamesRes.json();
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
  function hl(text, q) {
    if (!q || !q.trim()) return esc(text);
    return esc(text).replace(new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  function rname(id) { return meta.ratings[id]?.name || '?'; }
  function rtitle(id) { const r = meta.ratings[id]; return r ? (lang === 'id' ? r.titleId : r.titleEn) : ''; }
  function rcontent(id) { const r = meta.ratings[id]; return r ? (lang === 'id' ? r.contentId : r.contentEn) : ''; }
  function dname(id) { const d = meta.descriptors[id]; return d ? (lang === 'id' ? d.nameId : d.nameEn) : '?'; }
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
          <a class="detail-link-btn" href="https://www.google.com/search?q=${encodeURIComponent(`${game.name} by ${game.publisherName}`)}" target="_blank" rel="noopener">
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
    for (const p of pageRange(currentPage, total)) {
      h += p === '...' ? '<span class="page-ellipsis">…</span>'
        : `<button class="page-btn${p === currentPage ? ' active' : ''}" data-p="${p}" type="button">${p}</button>`;
    }
    h += `<button class="page-btn" data-p="${currentPage + 1}" ${currentPage === total ? 'disabled' : ''} type="button">${t('page.next')}</button>`;
    el.innerHTML = h;
    el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return; currentPage = parseInt(b.dataset.p); renderResults();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
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
