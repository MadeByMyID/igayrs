import type { SearchSort } from '@/shared/types';

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
    <div className="active-filter-summary" aria-label={t('search.active')} aria-live="polite">
      {filters.length ? (
        <>
          <span className="active-filter-label">{t('search.active')}</span>
          <span className="active-filter-chips">
            {filters.map(filter => (
              <button aria-label={filter.label} className="active-filter-chip" type="button" key={filter.id} onClick={filter.onRemove}>
                <span>{filter.label}</span>
              </button>
            ))}
          </span>
          <button className="active-filter-clear" type="button" onClick={onClearAll}>
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
    <label className="search-sort-control">
      <span>{t('search.sort')}</span>
      <select value={sort} onChange={event => setSort(event.currentTarget.value as SearchSort)}>
        {SEARCH_SORT_OPTIONS.map(option => (
          <option value={option.value} key={option.key}>{t(option.labelKey)}</option>
        ))}
      </select>
    </label>
  );
}
