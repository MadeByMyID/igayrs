import { Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { normalizeSteamExtras } from '@/core/steam-normalize';
import { fuzzyScoreNormalized } from '@/core/search-index';
import { safeHttpUrl } from '@/core/safe-render';
import { DescriptorIcons } from '@/shared/components/descriptor-icons';
import { RatingBadge } from '@/shared/components/rating-badge';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  computeSteamChecker,
  findGameByName,
  buildSteamRatingComparison,
  parseSteamRatingFlag,
  steamIgrsDescriptorIdsFromText,
  steamRatingToIgrsId
} from '@/shared/lib/steam-domain';
import { descriptorName, ratingTitle } from '@/shared/lib/ratings';
import { formatCount } from '@/shared/lib/format';
import styles from './steam-checker-page.module.css';
import type { IgrsGame, IgrsMeta, SteamGameDetails, SteamMeta, SteamReviewSummary } from '@/shared/types';

export interface SteamCheckerSidebarProps {
  appId: string;
  games: IgrsGame[];
  gamesByNormalizedName: Map<string, IgrsGame>;
  lang: 'en' | 'id';
  meta: IgrsMeta;
  reviewSummary: SteamReviewSummary | null;
  steamGame: SteamGameDetails;
  steamMeta: SteamMeta;
  unlocked: boolean;
  t: (key: string) => string;
}

export function SteamCheckerSidebar({
  appId,
  games,
  gamesByNormalizedName,
  lang,
  meta,
  reviewSummary,
  steamGame,
  steamMeta,
  unlocked,
  t
}: SteamCheckerSidebarProps) {
  const [copied, setCopied] = useState(false);
  const steamRating = steamGame.ratings?.igrs || null;
  const generated = parseSteamRatingFlag(steamRating?.rating_generated);
  const localMatch = findGameByName(games, steamGame.name, fuzzyScoreNormalized, gamesByNormalizedName);
  const checker = computeSteamChecker(meta, steamMeta, steamGame);
  const referenceRatingId = localMatch?.ratings?.[0] || null;
  const steamRatingId = steamRatingToIgrsId(steamRating);
  const steamRatingDescriptorIds = steamIgrsDescriptorIdsFromText(meta, steamRating?.descriptors || '', lang);
  const comparison = buildSteamRatingComparison({
    computedDescriptorIds: checker.mappedDescriptorIds,
    computedRatingId: checker.computedRatingId,
    localDescriptorIds: localMatch?.descriptors || [],
    localRatingId: referenceRatingId,
    steamDescriptorIds: steamRatingDescriptorIds,
    steamRatingId
  });
  const extras = useMemo(() => normalizeSteamExtras(steamGame), [steamGame]);
  const supportUrl = safeHttpUrl(steamGame.support_info?.url || '');
  const releaseDate = steamGame.release_date?.date || '';
  const steamStoreUrl = `https://store.steampowered.com/app/${appId}`;
  const shareUrl = `${window.location.origin}/steamchecker/?appid=${encodeURIComponent(appId)}`;

  const copyShareUrl = async () => {
    if (await copyTextToClipboard(shareUrl)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <article className={`${styles.ratingCard} ${styles.fadeIn}`}>
        <div className={`${styles.ratingCardSubtitle} ${styles.ratingCardKicker}`}>{t('steamchecker.reference')}</div>
        {localMatch ? (
          <>
            <div className={styles.ratingCardHeader}>
              <RatingBadge meta={meta} ratingId={referenceRatingId} />
              <div>
                <div className={styles.ratingCardTitle}>{referenceRatingId ? ratingTitle(meta, referenceRatingId, lang) : t('steamchecker.unknown')}</div>
                <div className={styles.ratingCardSubtitle}>{t('steamchecker.reference')}</div>
              </div>
            </div>
            <DescriptorIcons ids={localMatch.descriptors} emptyLabel={t('detail.noDescriptors')} lang={lang} meta={meta} />
          </>
        ) : (
          <div className={styles.noDescriptors}>{t('steamchecker.noLocalRating')}</div>
        )}
      </article>

      <article className={`${styles.ratingCard} ${styles.fadeIn}`}>
        <div className={`${styles.ratingCardSubtitle} ${styles.ratingCardKicker}`}>{t('steamchecker.steam')}</div>
        <div className={styles.ratingCardHeader}>
          <RatingBadge meta={meta} ratingId={steamRatingId} />
          <div>
            <div className={styles.ratingCardTitle}>{steamRatingId ? ratingTitle(meta, steamRatingId, lang) : t('steamchecker.noSteamRating')}</div>
            <div className={styles.ratingCardSubtitle}>{generated ? t('steamchecker.generated') : t('steamchecker.noMatch')}</div>
          </div>
        </div>
        <DescriptorIcons ids={steamRatingDescriptorIds} emptyLabel={t('steamchecker.noDescriptors')} lang={lang} meta={meta} />
      </article>

      <article className={`${styles.ratingCard} ${styles.fadeIn} ${styles.comparisonCard}`}>
        <div className={`${styles.ratingCardSubtitle} ${styles.ratingCardKicker}`}>{t('steamchecker.comparison')}</div>
        <dl className={styles.comparisonList}>
          <div>
            <dt>{t('detail.rating')}</dt>
            <dd>{t(comparisonLabelKey('rating', comparison.ratingStatus))}</dd>
          </div>
          <div>
            <dt>{t('detail.descriptors')}</dt>
            <dd>{t(comparisonLabelKey('descriptor', comparison.descriptorStatus))}</dd>
          </div>
        </dl>
        {comparison.missingFromSteamDescriptorIds.length ? (
          <p className={styles.comparisonNote}>
            {comparison.missingFromSteamDescriptorIds.map(id => descriptorName(meta, id, lang)).join(', ')}
          </p>
        ) : null}
        {comparison.unexpectedSteamDescriptorIds.length ? (
          <p className={styles.comparisonNote}>
            {comparison.unexpectedSteamDescriptorIds.map(id => descriptorName(meta, id, lang)).join(', ')}
          </p>
        ) : null}
      </article>

      <SteamReviewSummaryCard reviewSummary={reviewSummary} t={t} lang={lang} />

      <article className={`${styles.ratingCard} ${styles.fadeIn}`}>
        <div className={styles.checkerMeta}>
          {releaseDate ? <div className={styles.metaRow}><strong>{t('steamchecker.release')}:</strong> {releaseDate}</div> : null}
          {extras.requiredAge > 0 ? <div className={styles.metaRow}><strong>{t('steamchecker.requiredAge')}:</strong> {extras.requiredAge}+</div> : null}
          {extras.isBanned ? <div className={styles.metaRow}><strong>{t('steamchecker.banned')}:</strong> Yes</div> : null}
          {extras.metacritic ? (
            <div className={styles.metaRow}>
              <strong>Metacritic:</strong>{' '}
              {extras.metacritic.url
                ? <a className={styles.supportLink} href={extras.metacritic.url} target="_blank" rel="noopener noreferrer">{extras.metacritic.score}/100</a>
                : <span>{extras.metacritic.score}/100</span>}
            </div>
          ) : null}
          {extras.price ? (
            <div className={styles.metaRow}>
              <strong>{extras.isFree ? 'Free to Play' : 'Price'}:</strong>{' '}
              {extras.isFree ? 'Free' : extras.price.formattedFinal || `${(extras.price.final / 100).toFixed(2)} ${extras.price.currency}`}
              {extras.price.discountPercent > 0 ? <span>-{extras.price.discountPercent}%</span> : null}
            </div>
          ) : extras.isFree ? (
            <div className={styles.metaRow}><strong>Price:</strong> Free to Play</div>
          ) : null}
          {extras.genres.length > 0 ? (
            <div className={styles.metaRow}>
              <strong>Genres:</strong>{' '}
              <span>{extras.genres.map(g => g.description).join(', ')}</span>
            </div>
          ) : null}
          {extras.categories.length > 0 ? (
            <div className={styles.metaRow}>
              <strong>Categories:</strong>{' '}
              <span>{extras.categories.slice(0, 5).map(c => c.description).join(', ')}{extras.categories.length > 5 ? ` +${extras.categories.length - 5}` : ''}</span>
            </div>
          ) : null}
          <div className={styles.metaRow}>
            <strong>Platforms:</strong>{' '}
            {[extras.platforms.windows && 'Windows', extras.platforms.mac && 'macOS', extras.platforms.linux && 'Linux'].filter(Boolean).join(', ') || '-'}
          </div>
          {supportUrl ? (
            <div className={styles.metaRow}>
              <strong>{t('steamchecker.support')}:</strong>{' '}
              <a className={styles.supportLink} href={supportUrl.href} target="_blank" rel="noopener noreferrer">{supportUrl.hostname}</a>
            </div>
          ) : null}
        </div>
        <div className={`detail-actions ${styles.actions}`}>
          <button className={`detail-share-btn${copied ? ' copied' : ''}`} type="button" onClick={copyShareUrl}>
            {copied ? <Check className={styles.icon} aria-hidden="true" /> : <Copy className={styles.icon} aria-hidden="true" />}
            <span>{copied ? t('detail.copied') : t('detail.share')}</span>
          </button>
          <a className="detail-link-btn" href={steamStoreUrl} target="_blank" rel="noopener noreferrer">
            <span>{t('steamchecker.viewSteam')}</span>
          </a>
        </div>
      </article>

      {unlocked ? <article className={`${styles.ratingCard} ${styles.fadeIn}`}>
        <div className={`${styles.ratingCardSubtitle} ${styles.ratingCardKicker}`}>{t('steamchecker.ours')}</div>
        <div className={styles.ratingCardHeader}>
          <RatingBadge meta={meta} ratingId={checker.computedRatingId} />
          <div>
            <div className={styles.ratingCardTitle}>{ratingTitle(meta, checker.computedRatingId, lang)}</div>
            <div className={styles.ratingCardSubtitle}>{t('steamchecker.manual')}</div>
          </div>
        </div>
        <DescriptorIcons ids={checker.mappedDescriptorIds} emptyLabel={t('steamchecker.noManualMapping')} lang={lang} meta={meta} />
        <p className={styles.comparisonNote}>{t('steamchecker.advancedPublic')}</p>
      </article> : null}
    </>
  );
}

function comparisonLabelKey(scope: 'descriptor' | 'rating', status: 'match' | 'missing-local' | 'missing-steam' | 'mismatch' | 'unknown'): string {
  const suffix = {
    match: 'match',
    'missing-local': 'missingLocal',
    'missing-steam': 'missingSteam',
    mismatch: 'mismatch',
    unknown: 'unknown'
  }[status];
  return `steamchecker.comparison.${scope}.${suffix}`;
}

function SteamReviewSummaryCard({ lang, reviewSummary, t }: { lang: 'en' | 'id'; reviewSummary: SteamReviewSummary | null; t: (key: string) => string }) {
  return (
    <article className={`${styles.ratingCard} ${styles.fadeIn} ${styles.reviewSummaryCard}`}>
      <div className={`${styles.ratingCardSubtitle} ${styles.ratingCardKicker}`}>{t('steamchecker.recentReviews')}</div>
      {!reviewSummary ? (
        <div className={styles.noDescriptors}>{t('steamchecker.reviewsUnavailable')}</div>
      ) : (
        <>
          <div className={styles.reviewScore}>{reviewSummary.reviewScoreDesc}</div>
          {reviewSummary.positivePercent !== null ? (
            <div className={styles.reviewRate}>{t('steamchecker.positiveRate').replace('{percent}', String(reviewSummary.positivePercent))}</div>
          ) : null}
          <dl className={styles.reviewMetrics}>
            <div>
              <dt>{t('steamchecker.totalReviews')}</dt>
              <dd>{formatCount(reviewSummary.totalReviews, lang)}</dd>
            </div>
            <div>
              <dt>{t('steamchecker.positiveReviews')}</dt>
              <dd>{formatCount(reviewSummary.totalPositive, lang)}</dd>
            </div>
            <div>
              <dt>{t('steamchecker.negativeReviews')}</dt>
              <dd>{formatCount(reviewSummary.totalNegative, lang)}</dd>
            </div>
          </dl>
        </>
      )}
    </article>
  );
}
