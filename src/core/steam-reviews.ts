const STEAM_REVIEWS_BASE_URL = 'https://store.steampowered.com/appreviews';

import type { SteamReviewSummary } from '@/shared/types';

function toNonNegativeInteger(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function cleanLabel(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function buildSteamReviewsUrl(appId: unknown): string | null {
  const cleanAppId = String(appId || '').trim();
  if (!/^\d+$/.test(cleanAppId)) return null;
  const params = new URLSearchParams({
    json: '1',
    filter: 'recent',
    language: 'all',
    review_type: 'all',
    purchase_type: 'all',
    num_per_page: '1'
  });
  return `${STEAM_REVIEWS_BASE_URL}/${cleanAppId}?${params.toString()}`;
}

function getRecordValue(value: unknown, key: string): unknown {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}

export function normalizeSteamReviewSummary(payload: unknown): SteamReviewSummary | null {
  if (Number(getRecordValue(payload, 'success')) !== 1) return null;
  const querySummary = getRecordValue(payload, 'query_summary');
  if (!querySummary || typeof querySummary !== 'object') return null;

  const summary = querySummary as Record<string, unknown>;
  const reviewScoreDesc = cleanLabel(summary.review_score_desc);
  const reviewScore = toNonNegativeInteger(summary.review_score);
  const totalPositive = toNonNegativeInteger(summary.total_positive);
  const totalNegative = toNonNegativeInteger(summary.total_negative);
  const totalReviews = toNonNegativeInteger(summary.total_reviews) || totalPositive + totalNegative;
  const numReviews = toNonNegativeInteger(summary.num_reviews);

  if (!reviewScoreDesc && totalReviews === 0) return null;

  return {
    numReviews,
    positivePercent: totalReviews > 0 ? Math.min(100, Math.max(0, Math.round((totalPositive / totalReviews) * 100))) : null,
    reviewScore,
    reviewScoreDesc: reviewScoreDesc || '-',
    totalNegative,
    totalPositive,
    totalReviews
  };
}
