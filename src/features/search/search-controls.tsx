import type { SearchSort } from '@/shared/types';
import styles from './search-controls.module.css';

export interface ActiveFilter {
  id: string;
  label: string;
  onRemove: () => void;
}

export const SEARCH_SORT_OPTIONS: Array<{ key: string; labelKey: string; value: SearchSort }> = [
  { key: 'relevance', labelKey: 'search.sort.relevance', value: 'relevance' },
  { key: 'title-asc', labelKey: 'search.sort.titleAsc', value: 'title-asc' },
  { key: 'title-desc', labelKey: 'search.sort.titleDesc', value: 'title-desc' },
  { key: 'year-desc', labelKey: 'search.sort.yearDesc', value: 'year-desc' },
  { key: 'year-asc', labelKey: 'search.sort.yearAsc', value: 'year-asc' },
  { key: 'rating-desc', labelKey: 'search.sort.ratingDesc', value: 'rating-desc' },
  { key: 'rating-asc', labelKey: 'search.sort.ratingAsc', value: 'rating-asc' }
];

export function ActiveFilterSummary({
  filters,
  onClearAll,
  t
}: {
  filters: ActiveFilter[];
  onClearAll: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className={styles.filterSummary} aria-label={t('search.active')} aria-live="polite">
      {filters.length ? (
        <>
          <span className={styles.filterLabel}>{t('search.active')}</span>
          <span className={styles.filterChips}>
            {filters.map(filter => (
              <button aria-label={filter.label} className={styles.filterChip} type="button" key={filter.id} onClick={filter.onRemove}>
                <span>{filter.label}</span>
              </button>
            ))}
          </span>
          <button className={styles.filterClear} type="button" onClick={onClearAll}>
            {t('search.clearAll')}
          </button>
        </>
      ) : null}
    </div>
  );
}

export function SearchSortControl({
  setSort,
  sort,
  t
}: {
  setSort: (sort: SearchSort) => void;
  sort: SearchSort;
  t: (key: string) => string;
}) {
  return (
    <label className={styles.sortControl}>
      <span>{t('search.sort')}</span>
      <select value={sort} onChange={event => setSort(event.currentTarget.value as SearchSort)}>
        {SEARCH_SORT_OPTIONS.map(option => (
          <option value={option.value} key={option.key}>{t(option.labelKey)}</option>
        ))}
      </select>
    </label>
  );
}
