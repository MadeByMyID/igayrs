const STEAM_REVIEWS_BASE_URL = 'https://store.steampowered.com/appreviews';

function toNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function cleanLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function buildSteamReviewsUrl(appId) {
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

export function normalizeSteamReviewSummary(payload) {
  if (Number(payload?.success) !== 1) return null;
  const querySummary = payload?.query_summary;
  if (!querySummary || typeof querySummary !== 'object') return null;

  const reviewScoreDesc = cleanLabel(querySummary.review_score_desc);
  const reviewScore = toNonNegativeInteger(querySummary.review_score);
  const totalPositive = toNonNegativeInteger(querySummary.total_positive);
  const totalNegative = toNonNegativeInteger(querySummary.total_negative);
  const totalReviews = toNonNegativeInteger(querySummary.total_reviews) || totalPositive + totalNegative;
  const numReviews = toNonNegativeInteger(querySummary.num_reviews);

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
