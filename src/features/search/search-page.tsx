import { useCallback, useEffect, useMemo } from 'react';
import { FilterResultAnnouncement } from '@/features/search/filter-result-announcement';
import { buildSearchResultsModel } from '@/features/search/search-results-model';
import { useSearchIndex } from '@/shared/hooks/use-search-index';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { FilterSidebar } from '@/features/search/search-filters';
import { SearchHeader } from '@/features/search/search-header';
import { SearchPagination } from '@/features/search/search-pagination';
import { SearchResults } from '@/features/search/search-results';
import { GameDetailInline } from '@/features/search/game-detail-inline';
import { buildActiveFilters } from '@/features/search/build-active-filters';
import { computeSuggestion } from '@/features/search/search-suggestions';
import { useSearchFilters } from '@/features/search/use-search-filters';
import { useDetailPanel } from '@/features/search/use-detail-panel';
import { useSearchShortcut } from '@/features/search/use-search-shortcut';
import { useSteamApi } from '@/features/search/use-steam-api';
import { descriptorName, ratingName } from '@/shared/lib/ratings';
import { platformName } from '@/shared/lib/platforms';
import pageStyles from './search-page.module.css';

export function SearchPage() {
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();
  const steamApi = useSteamApi();
  const { detailId, showDetail, hideDetail } = useDetailPanel();

  const {
    state: { query, publisher, ratings, platforms, descriptors, years, page, sort },
    deferredQuery,
    deferredPublisher,
    actions,
    filterVersion,
    filterOrder,
    hasActiveFilters,
  } = useSearchFilters();

  useSearchShortcut();

  const { index: searchIndex, loading: indexLoading, error: indexError, retry: retryIndex } = useSearchIndex(
    data?.games ?? null,
    data?.meta ?? null
  );

  const { currentPage, filtered, totalPages, useVirtualScroll, visibleResults } = useMemo(() => buildSearchResultsModel({
    descriptors,
    meta: data?.meta ?? null,
    page,
    platforms,
    publisher: deferredPublisher,
    query: deferredQuery,
    ratings,
    searchIndex,
    sort,
    years,
  }), [data?.meta, deferredPublisher, deferredQuery, descriptors, page, platforms, ratings, searchIndex, sort, years]);

  const selectedGame = (detailId !== null ? data?.gamesById.get(detailId) : undefined) || null;

  // Clamp page to totalPages
  useEffect(() => { if (page > totalPages) actions.setPage(totalPages); }, [page, totalPages, actions]);

  // Scroll to top on page change
  useEffect(() => { if (currentPage > 1) window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentPage]);

  // Compute suggestion only when results are zero
  const suggestion = useMemo(() => {
    if (filtered.length > 0 || !searchIndex) return null;
    return computeSuggestion(
      searchIndex,
      { query: deferredQuery, publisher: deferredPublisher, ratings, platforms, descriptors, years },
      filterOrder
    );
  }, [filtered.length, searchIndex, deferredQuery, deferredPublisher, ratings, platforms, descriptors, years, filterOrder]);

  const getFilterLabel = useCallback((filterKey: string, filterValue: string | number): string => {
    const meta_ = data?.meta;
    if (!meta_) return String(filterValue);
    switch (filterKey) {
      case 'rating':
        return `${t('filter.rating')}: ${ratingName(meta_, filterValue as number)}`;
      case 'platform':
        return `${t('filter.platform')}: ${platformName(meta_, filterValue as number, lang)}`;
      case 'descriptor':
        return `${t('filter.descriptor')}: ${descriptorName(meta_, filterValue as number, lang)}`;
      case 'year':
        return `${t('filter.year')}: ${filterValue}`;
      default:
        return String(filterValue);
    }
  }, [data?.meta, lang, t]);

  // Error / loading states
  if (error) return <main className="app-layout" data-route-ready="search"><div className="main-content"><ErrorState title={t('data.error.title')} description={t('data.error.desc')} /></div></main>;
  if (indexError) return <main className="app-layout" data-route-ready="search"><div className="main-content"><ErrorState title={t('data.error.title')} description={indexError.message} /><button type="button" className="retry-button" onClick={retryIndex}>{t('retry') || 'Retry'}</button></div></main>;
  if (loading || !data || indexLoading || !searchIndex) return <main className="app-layout" data-route-ready="search"><div className="main-content"><LoadingState label={indexLoading ? (t('search.indexing') || 'Building search index…') : t('loading')} /></div></main>;

  const activeFilters = buildActiveFilters({
    query, publisher, ratings, platforms, descriptors, years,
    meta: data.meta, lang, t,
    setQuery: actions.setQuery,
    setPublisher: actions.setPublisher,
    setRatings: actions.setRatings,
    setPlatforms: actions.setPlatforms,
    setDescriptors: actions.setDescriptors,
    setYears: actions.setYears,
    setPage: actions.setPage,
  });

  const statsText = hasActiveFilters
    ? t('search.stats.filtered').replace('{count}', String(filtered.length)).replace('{total}', String(data.games.length))
    : t('search.stats').replace('{count}', String(filtered.length));

  return (
    <main className={`app-layout${selectedGame ? ' detail-active' : ''}`} data-route-ready="search">
      <div className="main-content">
        {!selectedGame && (
          <SearchHeader query={query} publisher={publisher} onQueryChange={v => { actions.setQuery(v); actions.setPage(1); }} onPublisherChange={v => { actions.setPublisher(v); actions.setPage(1); }} statsText={statsText} sort={sort} onSortChange={s => { actions.setSort(s); actions.setPage(1); }} activeFilters={activeFilters} onClearAll={() => actions.clearAll(true)} t={t} />
        )}
        <div id="list-view" className={selectedGame ? pageStyles.listViewHidden : undefined}>
          <SearchResults allResults={filtered} visibleResults={visibleResults} totalCount={filtered.length} useVirtualScroll={useVirtualScroll} filterVersion={filterVersion} lang={lang} meta={data.meta} onOpenDetail={showDetail} publisherQuery={publisher} query={query} onClearAll={() => actions.clearAll(true)} t={t} suggestion={suggestion} onRemoveFilter={actions.removeFilter} onClearQuery={actions.clearQuery} filterLabel={getFilterLabel} />
          {!useVirtualScroll && <SearchPagination currentPage={currentPage} totalPages={totalPages} setPage={actions.setPage} t={t} />}
        </div>
        <div id="detail-page" className={selectedGame ? pageStyles.detailPageActive : pageStyles.detailPage}>
          {selectedGame ? <GameDetailInline allGames={data.games} game={selectedGame} lang={lang} meta={data.meta} onBack={hideDetail} steamApi={steamApi} t={t} /> : null}
        </div>
      </div>
      {!selectedGame ? (
        <aside className="sidebar" id="sidebar">
          <FilterSidebar clearAll={actions.clearAll} descriptors={descriptors} lang={lang} meta={data.meta} platforms={platforms} ratings={ratings} searchIndex={searchIndex} setDescriptors={next => { actions.setDescriptors(next); actions.setPage(1); }} setPlatforms={next => { actions.setPlatforms(next); actions.setPage(1); }} setRatings={next => { actions.setRatings(next); actions.setPage(1); }} setYears={next => { actions.setYears(next); actions.setPage(1); }} t={t} years={years} />
        </aside>
      ) : null}
      <FilterResultAnnouncement resultCount={filtered.length} t={t} />
    </main>
  );
}
