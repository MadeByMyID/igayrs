import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Gamepad2 } from 'lucide-react';
import { DescriptorIcons } from '@/shared/components/descriptor-icons';
import { highlight } from '@/shared/lib/text';
import { descriptorIdsFromGame, ratingIdsFromGame, ratingName } from '@/shared/lib/ratings';
import { platformIdsFromGame, platformName } from '@/shared/lib/platforms';
import { SearchSuggestions } from '@/features/search/search-suggestions-panel';
import type { Suggestion } from '@/features/search/search-suggestions';
import type { IgrsGame, IgrsMeta } from '@/shared/types';
import pageStyles from './search-page.module.css';
import cardStyles from './game-card.module.css';

/** Estimated initial height; actual virtual rows are measured after render. */
const ESTIMATED_CARD_HEIGHT = 132;

/** Fallback gap between cards matching the CSS --card-gap variable. */
const CARD_GAP = 16;

/** Overscan count: items rendered above/below the visible viewport */
const OVERSCAN_COUNT = 5;

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
    <button className={`${cardStyles.gameCard} ${pageStyles.fadeIn}`} data-visual-role="game-card" type="button" onClick={onOpen}>
      <div className={cardStyles.gameCardTop}>
        <div className={cardStyles.gameCardInfo}>
          <span className={cardStyles.gameTitle}>{highlight(game.name, query)}</span>
          <div className={cardStyles.gamePublisher}>{highlight(game.publisherName, publisherQuery)}</div>
          <div className={cardStyles.gameCardMeta}>
            <div className={cardStyles.gameMetaGroup}>
              <span className={cardStyles.gameMetaLabel}>{t('detail.year')}</span>
              <span className={cardStyles.gameMetaValue}>{game.releaseYear}</span>
            </div>
            <div className={cardStyles.gameMetaGroup}>
              <span className={cardStyles.gameMetaLabel}>{t('detail.platforms')}</span>
              <span className={cardStyles.gameMetaValue}>{platformNames || '-'}</span>
            </div>
            <div className={cardStyles.descriptorPreview}>
              <DescriptorIcons ids={descriptorIds} emptyLabel={t('card.noDescriptors')} lang={lang} meta={meta} />
            </div>
          </div>
        </div>
        <div className={cardStyles.gameCardRight}>
          {ratingId ? <span className={cardStyles.ratingBadge} data-rating={ratingId}>{ratingName(meta, ratingId)}</span> : null}
          <span className={cardStyles.viewDetail}>{t('card.viewDetail')}</span>
        </div>
      </div>
    </button>
  );
}

interface SearchResultsProps {
  /** All filtered results (full set for virtual scrolling, or paginated slice for pagination mode) */
  allResults: Array<{ game: IgrsGame }>;
  /** Paginated slice of results (used when total ≤ threshold) */
  visibleResults: Array<{ game: IgrsGame }>;
  /** Total count of filtered results */
  totalCount: number;
  /** Whether virtual scrolling is active */
  useVirtualScroll: boolean;
  /** Incremented on filter/query change to trigger scroll reset */
  filterVersion: number;
  lang: 'en' | 'id';
  meta: IgrsMeta;
  onOpenDetail: (id: number) => void;
  publisherQuery: string;
  query: string;
  onClearAll: () => void;
  t: (key: string) => string;
  /** Computed suggestion for zero-results state */
  suggestion?: Suggestion | null;
  /** Callback to remove a specific filter by key and value */
  onRemoveFilter?: (filterKey: string, filterValue: string | number) => void;
  /** Callback to clear the search query */
  onClearQuery?: () => void;
  /** Resolves a filter key+value to a human-readable label */
  filterLabel?: (filterKey: string, filterValue: string | number) => string;
}

function VirtualizedResults({
  allResults,
  totalCount,
  filterVersion,
  lang,
  meta,
  onOpenDetail,
  publisherQuery,
  query,
  t,
}: Pick<SearchResultsProps, 'allResults' | 'totalCount' | 'filterVersion' | 'lang' | 'meta' | 'onOpenDetail' | 'publisherQuery' | 'query' | 't'>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is intentionally used for large result virtualization.
  const virtualizer = useVirtualizer({
    count: allResults.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT + CARD_GAP,
    measureElement: element => element.getBoundingClientRect().height,
    overscan: OVERSCAN_COUNT,
  });

  // Reset scroll to top when filters/query change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [filterVersion]);

  return (
    <section id="game-list" className={cardStyles.gameList}>
      <div className={cardStyles.virtualResultCount}>
        {t('search.showingResults').replace('{count}', String(totalCount))}
      </div>
      <div
        ref={scrollContainerRef}
        className={cardStyles.virtualScrollContainer}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(virtualItem => {
            const result = allResults[virtualItem.index];
            if (!result) return null;
            return (
              <div
                className={cardStyles.virtualRow}
                data-index={virtualItem.index}
                key={result.game.id}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <GameCard
                  game={result.game}
                  lang={lang}
                  meta={meta}
                  onOpen={() => onOpenDetail(result.game.id)}
                  publisherQuery={publisherQuery}
                  query={query}
                  t={t}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SearchResults({
  allResults,
  visibleResults,
  totalCount,
  useVirtualScroll,
  filterVersion,
  lang,
  meta,
  onOpenDetail,
  publisherQuery,
  query,
  onClearAll,
  t,
  suggestion,
  onRemoveFilter,
  onClearQuery,
  filterLabel,
}: SearchResultsProps) {
  if (totalCount === 0) {
    return (
      <section id="game-list" className={cardStyles.gameList}>
        <div className={`${pageStyles.emptyState} ${pageStyles.fadeIn}`}>
          <Gamepad2 className={pageStyles.emptyStateSvg} aria-hidden="true" />
          <div className={pageStyles.emptyStateTitle}>{t('empty.title')}</div>
          <div className={pageStyles.emptyStateDesc}>{t('empty.desc')}</div>
          <button className={pageStyles.emptyClearBtn} type="button" onClick={onClearAll}>{t('search.clearAll')}</button>
          {suggestion && onRemoveFilter && onClearQuery && filterLabel && (
            <SearchSuggestions
              suggestion={suggestion}
              onRemoveFilter={onRemoveFilter}
              onClearAll={onClearAll}
              onClearQuery={onClearQuery}
              t={t}
              filterLabel={filterLabel}
            />
          )}
        </div>
      </section>
    );
  }

  if (useVirtualScroll) {
    return (
      <VirtualizedResults
        allResults={allResults}
        totalCount={totalCount}
        filterVersion={filterVersion}
        lang={lang}
        meta={meta}
        onOpenDetail={onOpenDetail}
        publisherQuery={publisherQuery}
        query={query}
        t={t}
      />
    );
  }

  // Paginated mode (≤ 100 results)
  return (
    <section id="game-list" className={cardStyles.gameList}>
      {visibleResults.map(result => (
        <GameCard
          game={result.game}
          key={result.game.id}
          lang={lang}
          meta={meta}
          onOpen={() => onOpenDetail(result.game.id)}
          publisherQuery={publisherQuery}
          query={query}
          t={t}
        />
      ))}
    </section>
  );
}

