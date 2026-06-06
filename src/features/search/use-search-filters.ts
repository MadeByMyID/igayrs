/**
 * Hook that encapsulates search filter state, URL synchronization,
 * filter ordering (for suggestion tie-breaking), and version tracking
 * (for virtual scroll reset).
 *
 * Extracts the filter management concern from SearchPage into an
 * independently testable unit.
 */
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildSearchParams, readSearchState } from '@/core/url-state';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import type { SearchSort } from '@/shared/types';

export interface SearchFilterState {
  query: string;
  publisher: string;
  ratings: Set<number>;
  platforms: Set<number>;
  descriptors: Set<number>;
  years: Set<string>;
  page: number;
  sort: SearchSort;
}

export interface SearchFilterActions {
  setQuery: (value: string) => void;
  setPublisher: (value: string) => void;
  setRatings: (value: Set<number>) => void;
  setPlatforms: (value: Set<number>) => void;
  setDescriptors: (value: Set<number>) => void;
  setYears: (value: Set<string>) => void;
  setPage: (value: number) => void;
  setSort: (value: SearchSort) => void;
  clearAll: (focusSearch?: boolean) => void;
  removeFilter: (filterKey: string, filterValue: string | number) => void;
  clearQuery: () => void;
}

export interface UseSearchFiltersResult {
  /** Raw input state (for controlled inputs) */
  state: SearchFilterState;
  /** Debounced + deferred values (for triggering expensive computations) */
  deferredQuery: string;
  deferredPublisher: string;
  /** Mutation actions */
  actions: SearchFilterActions;
  /** Incremented on filter changes — used to reset virtual scroll position */
  filterVersion: number;
  /** Ordered list of filter keys by application time — for suggestion tie-breaking */
  filterOrder: string[];
  /** Whether any filter or query is active */
  hasActiveFilters: boolean;
}

const DEBOUNCE_MS = 200;

export function useSearchFilters(): UseSearchFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialState = readSearchState(searchParams);

  const [query, setQuery] = useState(initialState.query);
  const [publisher, setPublisher] = useState(initialState.publisher);
  const [ratings, setRatings] = useState(initialState.ratings);
  const [platforms, setPlatforms] = useState(initialState.platforms);
  const [descriptors, setDescriptors] = useState(initialState.descriptors);
  const [years, setYears] = useState(initialState.years);
  const [page, setPage] = useState(initialState.page);
  const [sort, setSort] = useState(initialState.sort);
  const [filterVersion, setFilterVersion] = useState(0);
  const [filterOrder, setFilterOrder] = useState<string[]>([]);

  // Debounce raw input values to avoid filtering on every keystroke
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const debouncedPublisher = useDebouncedValue(publisher, DEBOUNCE_MS);

  // Secondary rendering optimization: defer the debounced values
  const deferredQuery = useDeferredValue(debouncedQuery);
  const deferredPublisher = useDeferredValue(debouncedPublisher);

  // Track whether we're currently writing to prevent read-back-write loops
  const isWritingRef = useRef(false);

  // Sync state from URL when searchParams change (e.g. back/forward navigation)
  useEffect(() => {
    // Skip if we caused this searchParams change ourselves
    if (isWritingRef.current) {
      isWritingRef.current = false;
      return;
    }
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

  // Sync state to URL when debounced values change
  useEffect(() => {
    const params = buildSearchParams({
      query: debouncedQuery,
      publisher: debouncedPublisher,
      ratings,
      platforms,
      descriptors,
      years,
      page,
      sort,
    });
    if (params.toString() !== searchParams.toString()) {
      isWritingRef.current = true;
      setSearchParams(params, { replace: true });
    }
  }, [debouncedQuery, debouncedPublisher, descriptors, page, platforms, ratings, searchParams, setSearchParams, sort, years]);

  // Increment filterVersion on filter/query changes to trigger scroll reset
  const prevFilterKeyRef = useRef('');
  useEffect(() => {
    const filterKey = `${deferredQuery}|${deferredPublisher}|${[...ratings].sort().join(',')}|${[...platforms].sort().join(',')}|${[...descriptors].sort().join(',')}|${[...years].sort().join(',')}|${sort}`;
    if (prevFilterKeyRef.current && prevFilterKeyRef.current !== filterKey) {
      setFilterVersion(v => v + 1);
    }
    prevFilterKeyRef.current = filterKey;
  }, [deferredQuery, deferredPublisher, ratings, platforms, descriptors, years, sort]);

  // Track filter application order for suggestion tie-breaking
  const prevFiltersRef = useRef<{
    ratings: Set<number>;
    platforms: Set<number>;
    descriptors: Set<number>;
    years: Set<string>;
  }>({ ratings, platforms, descriptors, years });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const newEntries: string[] = [];

    for (const id of ratings) {
      if (!prev.ratings.has(id)) newEntries.push(`rating-${id}`);
    }
    for (const id of platforms) {
      if (!prev.platforms.has(id)) newEntries.push(`platform-${id}`);
    }
    for (const id of descriptors) {
      if (!prev.descriptors.has(id)) newEntries.push(`descriptor-${id}`);
    }
    for (const year of years) {
      if (!prev.years.has(year)) newEntries.push(`year-${year}`);
    }

    const currentKeys = new Set<string>();
    for (const id of ratings) currentKeys.add(`rating-${id}`);
    for (const id of platforms) currentKeys.add(`platform-${id}`);
    for (const id of descriptors) currentKeys.add(`descriptor-${id}`);
    for (const year of years) currentKeys.add(`year-${year}`);

    setFilterOrder(order => {
      const kept = order.filter(key => currentKeys.has(key));
      return newEntries.length > 0 ? [...kept, ...newEntries] : kept;
    });

    prevFiltersRef.current = { ratings, platforms, descriptors, years };
  }, [ratings, platforms, descriptors, years]);

  // Actions
  const clearAll = useCallback((focusSearch = false) => {
    setQuery('');
    setPublisher('');
    setRatings(new Set());
    setPlatforms(new Set());
    setDescriptors(new Set());
    setYears(new Set());
    setPage(1);
    if (focusSearch) {
      window.setTimeout(() => document.getElementById('search-input')?.focus(), 0);
    }
  }, []);

  const removeFilter = useCallback((filterKey: string, filterValue: string | number) => {
    switch (filterKey) {
      case 'rating': {
        setRatings(prev => { const next = new Set(prev); next.delete(filterValue as number); return next; });
        break;
      }
      case 'platform': {
        setPlatforms(prev => { const next = new Set(prev); next.delete(filterValue as number); return next; });
        break;
      }
      case 'descriptor': {
        setDescriptors(prev => { const next = new Set(prev); next.delete(filterValue as number); return next; });
        break;
      }
      case 'year': {
        setYears(prev => { const next = new Set(prev); next.delete(String(filterValue)); return next; });
        break;
      }
    }
    setPage(1);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery('');
    setPublisher('');
    setPage(1);
  }, []);

  const hasActiveFilters = !!(query || publisher || ratings.size || platforms.size || descriptors.size || years.size);

  return {
    state: { query, publisher, ratings, platforms, descriptors, years, page, sort },
    deferredQuery,
    deferredPublisher,
    actions: {
      setQuery,
      setPublisher,
      setRatings,
      setPlatforms,
      setDescriptors,
      setYears,
      setPage,
      setSort,
      clearAll,
      removeFilter,
      clearQuery,
    },
    filterVersion,
    filterOrder,
    hasActiveFilters,
  };
}
