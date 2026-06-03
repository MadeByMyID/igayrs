# Performance Review — IGRS2nd

**Date:** June 3, 2026

---

## Changed Files

1. `src/core/search-index.ts` — Eliminated redundant string operations in the hot filter/score path
2. `src/features/search/search-suggestions.ts` — Eliminated redundant normalization in suggestion computation

---

## Optimizations Applied

### 1. Pre-split query words in FilterContext (eliminate repeated work)

**Problem:** `fuzzyScorePreNormalized` called `q.split(/\s+/)` on every item during the word-prefix matching phase. The query string `q` is constant across all ~600 items per filter operation, but was re-split with a regex on each call. For 50K items (performance test scale), that's 50K unnecessary regex splits.

**Fix:** Pre-split query words once in `createFilterContext` and pass them to `scorePreNormalizedWithContext`, a new scoring function that accepts pre-split words.

**Evidence:** Performance test went from 31.5ms → passes under 25ms budget.

### 2. Replace regex split with literal split in fuzzyScorePreNormalized

**Problem:** `q.split(/\s+/)` and `t.split(/\s+/)` used regex splitting on already-normalized strings. Normalized strings only contain single spaces (guaranteed by `normalizeSearchText` which does `.replace(/\s+/g, ' ')`), so regex splitting is unnecessary overhead.

**Fix:** Changed to `q.split(' ')` and `t.split(' ')` — plain string split is faster than regex split when the delimiter is known to be a single character.

### 3. Eliminate double-normalization in the default filter path

**Problem:** `createFilterContext` called `normalizeSearchText(filters.query)`, then `matchIndexedItem` called `fuzzyScorePreNormalized(context.query, item.nameNorm)` which is fine. But previously, when using `fuzzyScoreNormalized` (which calls `normalizeSearchText` internally), the query was normalized twice: once in `createFilterContext` and once inside `fuzzyScoreNormalized`.

**Fix:** `createFilterContext` always normalizes inputs, and `matchIndexedItem` always uses the pre-normalized fast path (`scorePreNormalizedWithContext`). The `scoreFn` parameter is only used to decide whether to skip normalization in `createFilterContext` (when `fuzzyScorePreNormalized` is passed directly, the caller guarantees pre-normalized inputs).

### 4. Eliminate redundant normalization in computeSuggestion

**Problem:** `computeSuggestion` called `countIndexedGames` N times (once per active filter), and each call ran `normalizeSearchText(state.query)` and `normalizeSearchText(state.publisher)` inside `createFilterContext`. The query/publisher are constant across all evaluations.

**Fix:** Pre-normalize query and publisher once in `computeSuggestion`, then pass `fuzzyScorePreNormalized` as the scoring function to `countIndexedGames`. Since the scoring function signals "inputs are pre-normalized", `createFilterContext` skips redundant normalization.

---

## Performance Summary

- **Critical paths identified:** `filterIndexedGames` (every search keystroke at 200ms debounce), `computeSuggestion` (on every zero-result state, calling `countIndexedGames` N times)
- **Unnecessary work eliminated:** Double-normalization of query/publisher strings; repeated regex splitting of constant query in 50K-item hot loops; redundant `normalizeSearchText` calls across N filter removal evaluations in suggestion computation
- **Algorithmic improvements:** None needed — the algorithms were already O(n) which is correct for linear scan of a flat index. The improvement was eliminating constant-factor waste within the O(n) loop.
- **I/O and network improvements:** None needed — already uses parallel fetch, stale-while-revalidate caching, and Web Worker for off-main-thread indexing.
- **Memory improvements:** None needed — index is built once and reused; no leaks detected.
- **Micro-optimizations applied:** Regex split → literal string split (safe because normalized strings guarantee single-space delimiters).
- **Correctness preserved (confirmed):** All 237 tests pass including the previously-failing 50K-item performance test (now completes under 25ms budget). Build succeeds. TypeScript compiles clean. ESLint passes.
- **Tradeoffs made and why:** Added `scorePreNormalizedWithContext` as a dedicated fast-path function (~30 lines). This adds a small amount of code duplication with `fuzzyScorePreNormalized` but eliminates the need for the query to be re-split on every item. The duplication is acceptable because the two functions have different signatures (one accepts pre-split words array, one accepts raw strings).
- **Assumptions about scale, environment, or data:** Current production scale is ~600 games. Performance test validates at 50K items (83× production scale) to ensure headroom for growth. Normalized search text only contains `[a-z0-9 ]` characters with single-space separators (guaranteed by `normalizeSearchText`), making literal string split safe.
