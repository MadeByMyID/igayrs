import { type ActiveFilter } from '@/features/search/search-controls';
import { sortedNumbers, sortedYears, toggleSet } from '@/shared/lib/collections';
import { descriptorName, ratingName, ratingWeight } from '@/shared/lib/ratings';
import { platformName } from '@/shared/lib/platforms';
import type { IgrsMeta } from '@/shared/types';

interface BuildActiveFiltersParams {
  query: string;
  publisher: string;
  ratings: Set<number>;
  platforms: Set<number>;
  descriptors: Set<number>;
  years: Set<string>;
  meta: IgrsMeta;
  lang: 'en' | 'id';
  t: (key: string) => string;
  setQuery: (v: string) => void;
  setPublisher: (v: string) => void;
  setRatings: (v: Set<number>) => void;
  setPlatforms: (v: Set<number>) => void;
  setDescriptors: (v: Set<number>) => void;
  setYears: (v: Set<string>) => void;
  setPage: (v: number) => void;
}

export function buildActiveFilters(params: BuildActiveFiltersParams): ActiveFilter[] {
  const { query, publisher, ratings, platforms, descriptors, years, meta, lang, t, setQuery, setPublisher, setRatings, setPlatforms, setDescriptors, setYears, setPage } = params;
  const filters: ActiveFilter[] = [];

  if (query) filters.push({
    id: 'query',
    label: `${t('search.query')}: ${query}`,
    onRemove: () => { setQuery(''); setPage(1); }
  });

  if (publisher) filters.push({
    id: 'publisher',
    label: `${t('search.publisherLabel')}: ${publisher}`,
    onRemove: () => { setPublisher(''); setPage(1); }
  });

  for (const id of sortedNumbers(ratings).sort((a, b) => ratingWeight(meta, a) - ratingWeight(meta, b))) {
    filters.push({
      id: `rating-${id}`,
      label: `${t('filter.rating')}: ${ratingName(meta, id)}`,
      onRemove: () => { setRatings(toggleSet(ratings, id)); setPage(1); }
    });
  }

  for (const id of sortedNumbers(platforms).sort((a, b) => platformName(meta, a, lang).localeCompare(platformName(meta, b, lang)))) {
    filters.push({
      id: `platform-${id}`,
      label: `${t('filter.platform')}: ${platformName(meta, id, lang)}`,
      onRemove: () => { setPlatforms(toggleSet(platforms, id)); setPage(1); }
    });
  }

  for (const id of sortedNumbers(descriptors).sort((a, b) => descriptorName(meta, a, lang).localeCompare(descriptorName(meta, b, lang)))) {
    filters.push({
      id: `descriptor-${id}`,
      label: `${t('filter.descriptor')}: ${descriptorName(meta, id, lang)}`,
      onRemove: () => { setDescriptors(toggleSet(descriptors, id)); setPage(1); }
    });
  }

  for (const year of sortedYears(years)) {
    filters.push({
      id: `year-${year}`,
      label: `${t('filter.year')}: ${year}`,
      onRemove: () => { setYears(toggleSet(years, year)); setPage(1); }
    });
  }

  return filters;
}
