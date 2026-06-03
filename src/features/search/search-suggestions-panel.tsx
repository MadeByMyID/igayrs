import { Lightbulb } from 'lucide-react';
import type { Suggestion } from './search-suggestions';
import pageStyles from './search-page.module.css';

interface SearchSuggestionsProps {
  suggestion: Suggestion;
  onRemoveFilter: (filterKey: string, filterValue: string | number) => void;
  onClearAll: () => void;
  onClearQuery: () => void;
  t: (key: string) => string;
  /** Resolves a filter key+value to a human-readable label */
  filterLabel: (filterKey: string, filterValue: string | number) => string;
}

export function SearchSuggestions({
  suggestion,
  onRemoveFilter,
  onClearAll,
  onClearQuery,
  t,
  filterLabel,
}: SearchSuggestionsProps) {
  return (
    <div className={pageStyles.suggestion} role="status">
      <Lightbulb className={pageStyles.suggestionIcon} aria-hidden="true" />
      {suggestion.type === 'remove-filter' && (
        <span className={pageStyles.suggestionText}>
          {t('suggestion.removeFilter')
            .replace('{filter}', filterLabel(suggestion.filterKey, suggestion.filterValue))
            .replace('{count}', String(suggestion.resultCount))}
          {' '}
          <button
            className={pageStyles.suggestionAction}
            type="button"
            onClick={() => onRemoveFilter(suggestion.filterKey, suggestion.filterValue)}
          >
            {t('suggestion.removeAction')}
          </button>
        </span>
      )}
      {suggestion.type === 'clear-all' && (
        <span className={pageStyles.suggestionText}>
          {t('suggestion.clearAll').replace('{count}', String(suggestion.totalGames))}
          {' '}
          <button
            className={pageStyles.suggestionAction}
            type="button"
            onClick={onClearAll}
          >
            {t('search.clearAll')}
          </button>
        </span>
      )}
      {suggestion.type === 'clear-query' && (
        <span className={pageStyles.suggestionText}>
          {t('suggestion.clearQuery').replace('{count}', String(suggestion.totalGames))}
          {' '}
          <button
            className={pageStyles.suggestionAction}
            type="button"
            onClick={onClearQuery}
          >
            {t('suggestion.clearQueryAction')}
          </button>
        </span>
      )}
    </div>
  );
}
