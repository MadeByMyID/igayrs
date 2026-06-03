import { type ReactNode, useState, useCallback, useSyncExternalStore } from 'react';
import { ChevronDown } from 'lucide-react';
import { createGameSearchIndex } from '@/core/search-index';
import { toggleSet } from '@/shared/lib/collections';
import { descriptorName, ratingName, ratingWeight } from '@/shared/lib/ratings';
import { platformName } from '@/shared/lib/platforms';
import type { IgrsMeta } from '@/shared/types';
import styles from './search-filters.module.css';

const MOBILE_BREAKPOINT = '(max-width: 767px)';

function getMatchMedia() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(MOBILE_BREAKPOINT);
}

function subscribeMobileQuery(callback: () => void) {
  const mql = getMatchMedia();
  if (!mql) return () => {};
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getIsMobile() {
  return getMatchMedia()?.matches ?? false;
}

function getIsMobileServer() {
  return false;
}

/** Returns true when viewport is below 768px */
function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobileQuery, getIsMobile, getIsMobileServer);
}

interface FilterSidebarProps {
  clearAll: () => void;
  descriptors: Set<number>;
  lang: 'en' | 'id';
  meta: IgrsMeta;
  platforms: Set<number>;
  ratings: Set<number>;
  searchIndex: NonNullable<ReturnType<typeof createGameSearchIndex>>;
  setDescriptors: (next: Set<number>) => void;
  setPlatforms: (next: Set<number>) => void;
  setRatings: (next: Set<number>) => void;
  setYears: (next: Set<string>) => void;
  t: (key: string) => string;
  years: Set<string>;
}

export function FilterSidebar(props: FilterSidebarProps) {
  const {
    clearAll,
    descriptors,
    lang,
    meta,
    platforms,
    ratings,
    searchIndex,
    setDescriptors,
    setPlatforms,
    setRatings,
    setYears,
    t,
    years
  } = props;
  const hasFilters = ratings.size || platforms.size || descriptors.size || years.size;
  const isMobile = useIsMobile();

  return (
    <>
      <FilterPanel id="filter-rating" title={t('sidebar.rating')} activeCount={ratings.size} isMobile={isMobile}>
        {Object.entries(searchIndex.facets.ratingCounts)
          .map(([id, count]) => ({ count, id: Number(id) }))
          .sort((a, b) => ratingWeight(meta, a.id) - ratingWeight(meta, b.id))
          .map(({ count, id }) => (
            <FilterCheckbox
              checked={ratings.has(id)}
              count={count}
              key={id}
              label={ratingName(meta, id)}
              onChange={() => setRatings(toggleSet(ratings, id))}
            />
          ))}
      </FilterPanel>
      <FilterPanel id="filter-platform" title={t('sidebar.platform')} activeCount={platforms.size} isMobile={isMobile}>
        {Object.entries(searchIndex.facets.platformCounts)
          .map(([id, count]) => ({ count, id: Number(id) }))
          .sort((a, b) => platformName(meta, a.id, lang).localeCompare(platformName(meta, b.id, lang)))
          .map(({ count, id }) => (
            <FilterCheckbox
              checked={platforms.has(id)}
              count={count}
              key={id}
              label={platformName(meta, id, lang)}
              onChange={() => setPlatforms(toggleSet(platforms, id))}
            />
          ))}
      </FilterPanel>
      <FilterPanel id="filter-descriptor" title={t('sidebar.descriptor')} activeCount={descriptors.size} isMobile={isMobile}>
        {Object.entries(searchIndex.facets.descriptorCounts)
          .map(([id, count]) => ({ count, id: Number(id) }))
          .sort((a, b) => descriptorName(meta, a.id, lang).localeCompare(descriptorName(meta, b.id, lang)))
          .map(({ count, id }) => (
            <FilterCheckbox
              checked={descriptors.has(id)}
              count={count}
              key={id}
              label={descriptorName(meta, id, lang)}
              onChange={() => setDescriptors(toggleSet(descriptors, id))}
            />
          ))}
      </FilterPanel>
      <FilterPanel id="filter-year" title={t('filter.year')} activeCount={years.size} isMobile={isMobile}>
        {Object.entries(searchIndex.facets.yearCounts)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([year, count]) => (
            <FilterCheckbox
              checked={years.has(year)}
              count={count}
              key={year}
              label={year}
              onChange={() => setYears(toggleSet(years, year))}
            />
          ))}
      </FilterPanel>
      <button className={`${styles.clearBtn}${hasFilters ? '' : ` ${styles.clearBtnHidden}`}`} type="button" onClick={() => clearAll()}>
        {t('filter.clear')}
      </button>
    </>
  );
}

interface FilterPanelProps {
  children: ReactNode;
  id: string;
  title: string;
  activeCount: number;
  isMobile: boolean;
}

function FilterPanel({ children, id, title, activeCount, isMobile }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(!isMobile);
  const contentId = `${id}-content`;

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // On desktop, always show content (no accordion behavior)
  const expanded = isMobile ? isOpen : true;

  return (
    <section className={styles.filterPanel} id={id}>
      <button
        type="button"
        className={styles.filterPanelHeader}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={isMobile ? handleToggle : undefined}
      >
        <span>{title}</span>
        {isMobile && activeCount > 0 && (
          <span className={styles.activeCount}>{activeCount}</span>
        )}
        {isMobile && (
          <ChevronDown
            className={`${styles.chevron}${expanded ? ` ${styles.chevronOpen}` : ''}`}
            aria-hidden="true"
          />
        )}
      </button>
      <div
        id={contentId}
        className={`${styles.filterPanelBody}${id === 'filter-year' || id === 'filter-platform' ? ` ${styles.filterPanelBodyShort}` : ''}${!expanded ? ` ${styles.filterPanelBodyCollapsed}` : ''}`}
      >
        {children}
      </div>
    </section>
  );
}

function FilterCheckbox({ checked, count, label, onChange }: { checked: boolean; count: number; label: string; onChange: () => void }) {
  return (
    <label className={`${styles.filterCheckbox} filter-checkbox`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
      <span className={styles.filterCount}>{count}</span>
    </label>
  );
}
