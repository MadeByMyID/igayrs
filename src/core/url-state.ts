import type { SearchState } from '@/shared/types';

function toPositiveInteger(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function parseNumberList(params: URLSearchParams, key: string): Set<number> {
  const values = params
    .getAll(key)
    .flatMap(value => String(value).split(','))
    .map(value => toPositiveInteger(value.trim()))
    .filter((value): value is number => value !== null);
  return new Set(values);
}

function parseYearList(params: URLSearchParams, key: string): Set<string> {
  const values = params
    .getAll(key)
    .flatMap(value => String(value).split(','))
    .map(value => value.trim())
    .filter(value => /^\d{4}$/.test(value));
  return new Set(values);
}

function appendSet<T>(params: URLSearchParams, key: string, set: Set<T> | undefined, normalize: (value: T) => number | string | null = value => String(value)): void {
  if (!set?.size) return;
  const values = [...set]
    .map(normalize)
    .filter(value => value !== null && value !== '');
  if (!values.length) return;
  values.sort((a, b) => Number(a) - Number(b));
  params.set(key, values.join(','));
}

export function readSearchState(params = new URLSearchParams()): SearchState {
  const page = Number(params.get('page') || 1);
  return {
    query: String(params.get('q') || '').trim(),
    publisher: String(params.get('publisher') || '').trim(),
    ratings: parseNumberList(params, 'rating'),
    platforms: parseNumberList(params, 'platform'),
    descriptors: parseNumberList(params, 'descriptor'),
    years: parseYearList(params, 'year'),
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  };
}

export function buildSearchParams(state: Partial<SearchState> = {}): URLSearchParams {
  const params = new URLSearchParams();
  const query = String(state.query || '').trim();
  const publisher = String(state.publisher || '').trim();
  const page = Number(state.page || 1);

  if (query) params.set('q', query);
  if (publisher) params.set('publisher', publisher);
  appendSet(params, 'rating', state.ratings, toPositiveInteger);
  appendSet(params, 'platform', state.platforms, toPositiveInteger);
  appendSet(params, 'descriptor', state.descriptors, toPositiveInteger);
  appendSet(params, 'year', state.years, value => (/^\d{4}$/.test(String(value)) ? String(value) : null));
  if (Number.isFinite(page) && page > 1) params.set('page', String(Math.floor(page)));

  return params;
}
