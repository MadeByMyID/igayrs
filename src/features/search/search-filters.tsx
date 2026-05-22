import type { ReactNode } from 'react';
import { createGameSearchIndex } from '@/core/search-index';
import { descriptorName, platformName, ratingName, ratingWeight } from '@/shared/lib/domain';
import type { IgrsMeta } from '@/shared/types';

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
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

  return (
    <>
      <FilterPanel id="filter-rating" title={t('sidebar.rating')}>
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
      <FilterPanel id="filter-platform" title={t('sidebar.platform')}>
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
      <FilterPanel id="filter-descriptor" title={t('sidebar.descriptor')}>
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
      <FilterPanel id="filter-year" title={t('filter.year')}>
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
      <button className={`filter-clear-btn${hasFilters ? '' : ' hidden'}`} type="button" onClick={() => clearAll()}>
        {t('filter.clear')}
      </button>
    </>
  );
}

function FilterPanel({ children, id, title }: { children: ReactNode; id: string; title: string }) {
  return (
    <section className="filter-panel" id={id}>
      <div className="filter-panel-header">
        <span>{title}</span>
      </div>
      <div className="filter-panel-body">{children}</div>
    </section>
  );
}

function FilterCheckbox({ checked, count, label, onChange }: { checked: boolean; count: number; label: string; onChange: () => void }) {
  return (
    <label className="filter-checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
      <span className="count">{count}</span>
    </label>
  );
}
