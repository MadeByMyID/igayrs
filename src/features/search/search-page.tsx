import { Check, ChevronLeft, ChevronRight, Copy, Gamepad2, Search, User } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IGRS_LOGO_URL } from '@/core/constants';
import { createGameSearchIndex, filterIndexedGames, fuzzyScoreNormalized, sortFilterResults } from '@/core/search-index';
import { buildSearchParams, readSearchState } from '@/core/url-state';
import { safeHttpUrl } from '@/core/safe-render';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { createSteamApi } from '@/shared/api/steam-api';
import { DescriptorIcons } from '@/shared/components/descriptor-icons';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { ActiveFilterSummary, SearchSortControl, type ActiveFilter } from '@/features/search/search-controls';
import { FilterSidebar } from '@/features/search/search-filters';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  descriptorIdsFromGame,
  descriptorName,
  formatExtraField,
  platformIdsFromGame,
  platformName,
  ratingIdsFromGame,
  ratingName,
  ratingTitle,
  ratingWeight
} from '@/shared/lib/domain';
import type { IgrsGame, IgrsMeta, SteamSearchResult } from '@/shared/types';

const PER_PAGE = 30;

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function sortedNumbers(values: Iterable<number>): number[] {
  return [...values].sort((a, b) => a - b);
}

function sortedYears(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => Number(b) - Number(a));
}

function pageRange(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: Array<number | '...'> = [1];
  if (current > 3) pages.push('...');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) pages.push(page);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function highlight(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const matcher = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(matcher).map((part, index) => (
    part.toLowerCase() === trimmed.toLowerCase()
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
}

export function SearchPage() {
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialState = readSearchState(searchParams);
  const [query, setQuery] = useState(initialState.query);
  const [publisher, setPublisher] = useState(initialState.publisher);
  const [ratings, setRatings] = useState(initialState.ratings);
  const [platforms, setPlatforms] = useState(initialState.platforms);
  const [descriptors, setDescriptors] = useState(initialState.descriptors);
  const [years, setYears] = useState(initialState.years);
  const [page, setPage] = useState(initialState.page);
  const [sort, setSort] = useState(initialState.sort);
  const [detailId, setDetailId] = useState<number | null>(null);
  const lastScrollYRef = useRef(0);
  const steamApi = useMemo(() => createSteamApi({ t }), [t]);
  const deferredQuery = useDeferredValue(query);
  const deferredPublisher = useDeferredValue(publisher);

  useEffect(() => {
    const state = readSearchState(searchParams);
    setQuery(state.query);
    setPublisher(state.publisher);
    setRatings(state.ratings);
    setPlatforms(state.platforms);
    setDescriptors(state.descriptors);
    setYears(state.years);
    setPage(state.page);
    setSort(state.sort);
  }, [searchParams]);

  useEffect(() => {
    const match = location.hash.match(/^#(\d+)$/);
    setDetailId(match ? Number.parseInt(match[1] ?? '', 10) : null);
  }, [location.hash]);

  useEffect(() => {
    const params = buildSearchParams({ query, publisher, ratings, platforms, descriptors, years, page, sort });
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [descriptors, page, platforms, publisher, query, ratings, searchParams, setSearchParams, sort, years]);

  const searchIndex = useMemo(() => {
    if (!data) return null;
    return createGameSearchIndex(data.games, {
      getDescriptorIds: descriptorIdsFromGame,
      getPlatformIds: game => platformIdsFromGame(data.meta, game),
      getRatingIds: ratingIdsFromGame
    });
  }, [data]);

  const filtered = useMemo(() => {
    if (!searchIndex) return [];
    const results = filterIndexedGames(searchIndex.items, {
      descriptors,
      platforms,
      publisher: deferredPublisher,
      query: deferredQuery,
      ratings,
      years
    }, fuzzyScoreNormalized);
    return sortFilterResults(results, sort, ratingId => ratingWeight(data?.meta as IgrsMeta, ratingId));
  }, [data?.meta, deferredPublisher, deferredQuery, descriptors, platforms, ratings, searchIndex, sort, years]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleResults = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const selectedGame = data?.games.find(game => game.id === detailId) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (error) {
    return (
      <main className="app-layout" data-route-ready="search">
        <div className="main-content">
          <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
        </div>
      </main>
    );
  }

  if (loading || !data || !searchIndex) {
    return (
      <main className="app-layout" data-route-ready="search">
        <div className="main-content">
          <LoadingState label={t('loading')} />
        </div>
      </main>
    );
  }

  const currentData = data;

  const clearAll = (focusSearch = false) => {
    setQuery('');
    setPublisher('');
    setRatings(new Set());
    setPlatforms(new Set());
    setDescriptors(new Set());
    setYears(new Set());
    setPage(1);
    if (focusSearch) window.setTimeout(() => document.getElementById('search-input')?.focus(), 0);
  };

  const showDetail = (id: number) => {
    lastScrollYRef.current = window.scrollY;
    navigate({ pathname: '/search/', search: location.search, hash: `#${id}` });
  };

  const hideDetail = () => {
    setDetailId(null);
    navigate({ pathname: '/search/', search: location.search }, { replace: true });
    window.requestAnimationFrame(() => window.scrollTo({ top: lastScrollYRef.current, behavior: 'auto' }));
  };

  const activeFilters = buildActiveFilters();

  function buildActiveFilters(): ActiveFilter[] {
    const filters: ActiveFilter[] = [];
    if (query) filters.push({
      id: 'query',
      label: `${t('search.query')}: ${query}`,
      onRemove: () => {
        setQuery('');
        setPage(1);
      }
    });
    if (publisher) filters.push({
      id: 'publisher',
      label: `${t('search.publisherLabel')}: ${publisher}`,
      onRemove: () => {
        setPublisher('');
        setPage(1);
      }
    });
    for (const id of sortedNumbers(ratings).sort((a, b) => ratingWeight(currentData.meta, a) - ratingWeight(currentData.meta, b))) {
      filters.push({
        id: `rating-${id}`,
        label: `${t('filter.rating')}: ${ratingName(currentData.meta, id)}`,
        onRemove: () => {
          setRatings(toggleSet(ratings, id));
          setPage(1);
        }
      });
    }
    for (const id of sortedNumbers(platforms).sort((a, b) => platformName(currentData.meta, a, lang).localeCompare(platformName(currentData.meta, b, lang)))) {
      filters.push({
        id: `platform-${id}`,
        label: `${t('filter.platform')}: ${platformName(currentData.meta, id, lang)}`,
        onRemove: () => {
          setPlatforms(toggleSet(platforms, id));
          setPage(1);
        }
      });
    }
    for (const id of sortedNumbers(descriptors).sort((a, b) => descriptorName(currentData.meta, a, lang).localeCompare(descriptorName(currentData.meta, b, lang)))) {
      filters.push({
        id: `descriptor-${id}`,
        label: `${t('filter.descriptor')}: ${descriptorName(currentData.meta, id, lang)}`,
        onRemove: () => {
          setDescriptors(toggleSet(descriptors, id));
          setPage(1);
        }
      });
    }
    for (const year of sortedYears(years)) {
      filters.push({
        id: `year-${year}`,
        label: `${t('filter.year')}: ${year}`,
        onRemove: () => {
          setYears(toggleSet(years, year));
          setPage(1);
        }
      });
    }
    return filters;
  }

  return (
    <main className={`app-layout${selectedGame ? ' detail-active' : ''}`} data-route-ready="search">
      <div className="main-content">
        <section className="search-section" style={{ display: selectedGame ? 'none' : undefined }}>
          <div className="search-row">
            <div className="search-bar">
              <Search className="ui-icon" aria-hidden="true" />
              <input
                id="search-input"
                type="text"
                value={query}
                placeholder={t('search.placeholder')}
                autoComplete="off"
                onChange={event => {
                  setQuery(event.currentTarget.value);
                  setPage(1);
                }}
                onKeyDown={event => handleInputKey(event, () => clearAll(true))}
              />
            </div>
            <div className="search-bar publisher-bar">
              <User className="ui-icon" aria-hidden="true" />
              <input
                type="text"
                value={publisher}
                placeholder={t('search.publisher')}
                autoComplete="off"
                onChange={event => {
                  setPublisher(event.currentTarget.value);
                  setPage(1);
                }}
                onKeyDown={event => handleInputKey(event, () => clearAll(true))}
              />
            </div>
          </div>
          <div className="search-stats">
            {query || publisher || ratings.size || platforms.size || descriptors.size || years.size
              ? t('search.stats.filtered').replace('{count}', String(filtered.length)).replace('{total}', String(data.games.length))
              : t('search.stats').replace('{count}', String(filtered.length))}
          </div>
          <SearchSortControl
            sort={sort}
            setSort={nextSort => {
              setSort(nextSort);
              setPage(1);
            }}
            t={t}
          />
          <ActiveFilterSummary filters={activeFilters} onClearAll={() => clearAll(true)} t={t} />
        </section>

        <div id="list-view" className={`list-view${selectedGame ? ' hidden' : ''}`}>
          <section id="game-list" className="game-list">
            {visibleResults.length ? visibleResults.map(result => (
              <GameCard
                game={result.game}
                key={result.game.id}
                lang={lang}
                meta={data.meta}
                onOpen={() => showDetail(result.game.id)}
                publisherQuery={publisher}
                query={query}
                t={t}
              />
            )) : (
              <div className="empty-state fade-in">
                <Gamepad2 className="empty-state-svg" aria-hidden="true" />
                <div className="empty-state-title">{t('empty.title')}</div>
                <div className="empty-state-desc">{t('empty.desc')}</div>
                <button className="empty-clear-btn" type="button" onClick={() => clearAll(true)}>{t('search.clearAll')}</button>
              </div>
            )}
          </section>
          <Pagination currentPage={currentPage} totalPages={totalPages} setPage={setPage} t={t} />
        </div>

        <div id="detail-page" className={`detail-page${selectedGame ? ' active' : ''}`}>
          {selectedGame ? (
            <GameDetail
              game={selectedGame}
              lang={lang}
              meta={data.meta}
              onBack={hideDetail}
              steamApi={steamApi}
              t={t}
            />
          ) : null}
        </div>
      </div>

      {!selectedGame ? (
        <aside className="sidebar" id="sidebar">
          <FilterSidebar
            clearAll={clearAll}
            descriptors={descriptors}
            lang={lang}
            meta={data.meta}
            platforms={platforms}
            ratings={ratings}
            searchIndex={searchIndex}
            setDescriptors={next => {
              setDescriptors(next);
              setPage(1);
            }}
            setPlatforms={next => {
              setPlatforms(next);
              setPage(1);
            }}
            setRatings={next => {
              setRatings(next);
              setPage(1);
            }}
            setYears={next => {
              setYears(next);
              setPage(1);
            }}
            t={t}
            years={years}
          />
        </aside>
      ) : null}
    </main>
  );
}

function handleInputKey(event: KeyboardEvent<HTMLInputElement>, clearAll: () => void): void {
  if (event.key === 'Escape') {
    clearAll();
    event.currentTarget.blur();
  }
}

interface GameCardProps {
  game: IgrsGame;
  lang: 'en' | 'id';
  meta: IgrsMeta;
  onOpen: () => void;
  publisherQuery: string;
  query: string;
  t: (key: string) => string;
}

function GameCard({ game, lang, meta, onOpen, publisherQuery, query, t }: GameCardProps) {
  const ratingId = ratingIdsFromGame(game)[0] || null;
  const descriptorIds = descriptorIdsFromGame(game).slice(0, 4);
  const platformNames = platformIdsFromGame(meta, game).map(id => platformName(meta, id, lang)).join(', ');

  return (
    <button className="game-card fade-in" type="button" onClick={onOpen}>
      <div className="game-card-top">
        <div className="game-card-info">
          <span className="game-title">{highlight(game.name, query)}</span>
          <div className="game-publisher">{highlight(game.publisherName, publisherQuery)}</div>
          <div className="game-card-meta">
            <div className="game-meta-group">
              <span className="game-meta-label">{t('detail.year')}</span>
              <span className="game-meta-value">{game.releaseYear}</span>
            </div>
            <div className="game-meta-group">
              <span className="game-meta-label">{t('detail.platforms')}</span>
              <span className="game-meta-value">{platformNames || '-'}</span>
            </div>
            <div className="descriptor-preview">
              <DescriptorIcons ids={descriptorIds} emptyLabel={t('card.noDescriptors')} lang={lang} meta={meta} />
            </div>
          </div>
        </div>
        <div className="game-card-right">
          {ratingId ? <span className="rating-badge" data-rating={ratingId}>{ratingName(meta, ratingId)}</span> : null}
          <span className="view-detail">{t('card.viewDetail')}</span>
        </div>
      </div>
    </button>
  );
}

function Pagination({ currentPage, setPage, t, totalPages }: { currentPage: number; setPage: (page: number) => void; t: (key: string) => string; totalPages: number }) {
  if (totalPages <= 1) return <nav className="pagination" aria-label="Page navigation" />;

  return (
    <nav className="pagination" aria-label="Page navigation">
      <div className="pagination-status">{t('page.status').replace('{page}', String(currentPage)).replace('{total}', String(totalPages))}</div>
      <div className="pagination-controls">
        <button className="page-btn" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
          <ChevronLeft className="ui-icon" aria-hidden="true" />
          <span>{t('page.prev')}</span>
        </button>
        <div className="pagination-center">
          {pageRange(currentPage, totalPages).map((item, index) => (
            item === '...'
              ? <span className="page-ellipsis" key={`ellipsis-${index}`}>...</span>
              : (
                <button className={`page-btn${item === currentPage ? ' active' : ''}`} type="button" key={item} onClick={() => setPage(item)}>
                  {item}
                </button>
              )
          ))}
        </div>
        <button className="page-btn" type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
          <span>{t('page.next')}</span>
          <ChevronRight className="ui-icon" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function GameDetail({
  game,
  lang,
  meta,
  onBack,
  steamApi,
  t
}: {
  game: IgrsGame;
  lang: 'en' | 'id';
  meta: IgrsMeta;
  onBack: () => void;
  steamApi: ReturnType<typeof createSteamApi>;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const [steamMatch, setSteamMatch] = useState<SteamSearchResult | null>(null);
  const ratingId = ratingIdsFromGame(game)[0] || null;
  const ratingIds = ratingIdsFromGame(game);
  const descriptorIds = descriptorIdsFromGame(game);
  const platformText = platformIdsFromGame(meta, game).map(id => platformName(meta, id, lang)).join(', ');
  const video = formatExtraField(game.videoUrl, t('detail.linksPatched'));
  const inGame = formatExtraField(game.inGameUrl, t('detail.linksPatched'));

  useEffect(() => {
    setSteamMatch(null);
    let cancelled = false;
    void steamApi.findSteamMatchForGame(game)
      .then(result => {
        if (!cancelled) setSteamMatch(result);
      })
      .catch(() => {
        if (!cancelled) setSteamMatch({ status: 'none', match: null, candidates: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [game, steamApi]);

  const copyShareUrl = async () => {
    if (await copyTextToClipboard(`${window.location.origin}/game/${game.id}`)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button className="detail-back" type="button" onClick={onBack}>
        <ChevronLeft className="ui-icon" aria-hidden="true" />
        {t('detail.back')}
      </button>
      <div className="detail-card fade-in">
        <div className="detail-header">
          <div>
            <div className="detail-title">{game.name}</div>
            <div className="detail-publisher">{game.publisherName}</div>
          </div>
          {ratingId ? <span className="rating-badge" data-rating={ratingId}>{ratingName(meta, ratingId)}</span> : null}
        </div>
        <p className="detail-description">{game.description || t('detail.noDesc')}</p>
        <div className="detail-grid">
          <DetailRow label={t('detail.publisher')}>{game.publisherName}</DetailRow>
          <DetailRow label={t('detail.year')}>{game.releaseYear}</DetailRow>
          <DetailRow label={t('detail.platforms')}>{platformText || '-'}</DetailRow>
          <DetailRow label={t('detail.rating')}>{ratingIds.map(id => ratingTitle(meta, id, lang)).join(', ') || '-'}</DetailRow>
          <DetailRow label={t('detail.descriptors')}>
            <DescriptorIcons ids={descriptorIds} emptyLabel={t('detail.noDescriptors')} lang={lang} meta={meta} />
          </DetailRow>
          {video ? <DetailLinkRow label={t('detail.video')} value={video} /> : null}
          {inGame ? <DetailLinkRow label={t('detail.ingame')} value={inGame} /> : null}
        </div>
        <div className="detail-actions">
          <button className={`detail-share-btn${copied ? ' copied' : ''}`} type="button" onClick={copyShareUrl}>
            {copied ? <Check className="ui-icon" aria-hidden="true" /> : <Copy className="ui-icon" aria-hidden="true" />}
            <span>{copied ? t('detail.copied') : t('detail.share')}</span>
          </button>
          <a className="detail-link-btn" href={`https://igrs.id/game-detail/${game.id}`} target="_blank" rel="noopener noreferrer">
            <img src={IGRS_LOGO_URL} alt="" aria-hidden="true" />
            <span>{t('detail.openIgrs')}</span>
          </a>
          <a className="detail-link-btn" href={`https://www.google.com/search?q=${encodeURIComponent(`${game.name} ${t('steamchecker.by')} ${game.publisherName}`)}`} target="_blank" rel="noopener noreferrer">
            <Search className="ui-icon" aria-hidden="true" />
            <span>{t('detail.searchGoogle')}</span>
          </a>
        </div>
        <SteamMatchPanel result={steamMatch} t={t} />
      </div>
    </>
  );
}

function DetailRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <>
      <div className="detail-label">{label}</div>
      <div className="detail-value">{children}</div>
    </>
  );
}

function DetailLinkRow({ label, value }: { label: string; value: string }) {
  const url = safeHttpUrl(value);
  return (
    <DetailRow label={label}>
      {url ? <a href={url.href} target="_blank" rel="noopener noreferrer">{url.href}</a> : value}
    </DetailRow>
  );
}

function SteamMatchPanel({ result, t }: { result: SteamSearchResult | null; t: (key: string) => string }) {
  if (!result) {
    return (
      <div className="detail-steam-match" aria-live="polite">
        <div className="steam-match-panel steam-match-panel-muted">
          <div className="loading-spinner" />
          <div>
            <div className="steam-match-title">{t('detail.steamLookup.title')}</div>
            <div className="steam-match-status">{t('detail.steamLookup.loading')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === 'match' && result.match) {
    return (
      <div className="detail-steam-match" aria-live="polite">
        <div className="steam-match-panel">
          <div>
            <div className="steam-match-title">{t('detail.steamLookup.title')}</div>
            <div className="steam-match-status">{t('detail.steamLookup.found')}</div>
            <div className="steam-match-name">{result.match.name}</div>
            <div className="steam-match-meta">App ID {result.match.appId}</div>
          </div>
          <Link className="detail-link-btn" to={`/steamchecker/?appid=${encodeURIComponent(result.match.appId)}`}>{t('detail.steamLookup.check')}</Link>
        </div>
      </div>
    );
  }

  if (result.status === 'ambiguous' && result.candidates.length) {
    return (
      <div className="detail-steam-match" aria-live="polite">
        <div className="steam-match-panel">
          <div>
            <div className="steam-match-title">{t('detail.steamLookup.title')}</div>
            <div className="steam-match-status">{t('detail.steamLookup.possible')}</div>
            <div className="steam-match-meta">{t('detail.steamLookup.choose')}</div>
          </div>
          <div className="steam-match-options">
            {result.candidates.map(candidate => (
              <Link className="detail-link-btn" to={`/steamchecker/?appid=${encodeURIComponent(candidate.appId)}`} key={candidate.appId}>
                <span>{candidate.name}</span>
                <span className="steam-match-appid">{candidate.appId}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-steam-match" aria-live="polite">
      <div className="steam-match-panel steam-match-panel-muted">
        <div>
          <div className="steam-match-title">{t('detail.steamLookup.title')}</div>
          <div className="steam-match-status">{t('detail.steamLookup.notFound')}</div>
        </div>
      </div>
    </div>
  );
}
