import { Search, User } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { ActiveFilterSummary, SearchSortControl, type ActiveFilter } from '@/features/search/search-controls';
import type { SearchSort } from '@/shared/types';
import pageStyles from './search-page.module.css';

export interface SearchHeaderProps {
  query: string;
  publisher: string;
  onQueryChange: (value: string) => void;
  onPublisherChange: (value: string) => void;
  statsText: string;
  sort: SearchSort;
  onSortChange: (sort: SearchSort) => void;
  activeFilters: ActiveFilter[];
  onClearAll: () => void;
  t: (key: string) => string;
}

function handleInputKey(event: KeyboardEvent<HTMLInputElement>, clearAll: () => void): void {
  if (event.key === 'Escape') {
    clearAll();
    event.currentTarget.blur();
  }
}

export function SearchHeader({
  query,
  publisher,
  onQueryChange,
  onPublisherChange,
  statsText,
  sort,
  onSortChange,
  activeFilters,
  onClearAll,
  t
}: SearchHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <section className={pageStyles.searchSection}>
      <div className={pageStyles.searchRow}>
        <div className={pageStyles.searchBar}>
          <Search className={pageStyles.searchBarIcon} aria-hidden="true" />
          <input
            id="search-input"
            className={pageStyles.searchBarInput}
            type="text"
            value={query}
            placeholder={t('search.placeholder')}
            aria-label="Search games by title"
            autoComplete="off"
            onChange={event => onQueryChange(event.currentTarget.value)}
            onKeyDown={event => handleInputKey(event, onClearAll)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {!searchFocused && (
            <kbd className={pageStyles.searchShortcutHint} aria-hidden="true">
              Press <span className={pageStyles.searchShortcutKey}>/</span> to search
            </kbd>
          )}
        </div>
        <div className={`${pageStyles.searchBar} ${pageStyles.publisherBar}`}>
          <User className={pageStyles.searchBarIcon} aria-hidden="true" />
          <input
            className={pageStyles.searchBarInput}
            type="text"
            value={publisher}
            placeholder={t('search.publisher')}
            aria-label="Filter by publisher"
            autoComplete="off"
            onChange={event => onPublisherChange(event.currentTarget.value)}
            onKeyDown={event => handleInputKey(event, onClearAll)}
          />
        </div>
      </div>
      <div className={pageStyles.searchStats}>
        {statsText}
      </div>
      <SearchSortControl
        sort={sort}
        setSort={onSortChange}
        t={t}
      />
      <ActiveFilterSummary filters={activeFilters} onClearAll={onClearAll} t={t} />
    </section>
  );
}
