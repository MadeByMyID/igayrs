import { Check, Copy, ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { renderSteamDescription } from '@/core/steam-description';
import { fuzzyScoreNormalized } from '@/core/search-index';
import { safeHttpUrl } from '@/core/safe-render';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { createSteamApi } from '@/shared/api/steam-api';
import { DescriptorIcons } from '@/shared/components/descriptor-icons';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { RatingBadge } from '@/shared/components/rating-badge';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  computeSteamChecker,
  findGameByName,
  buildSteamRatingComparison,
  parseSteamAppId,
  parseSteamRatingFlag,
  descriptorName,
  ratingTitle,
  steamIgrsDescriptorIdsFromText,
  steamRatingToIgrsId,
  stripHtml
} from '@/shared/lib/domain';
import { formatCount } from '@/shared/lib/format';
import type { IgrsGame, SteamGameDetails, SteamReviewSummary } from '@/shared/types';
import type { IgrsMeta, SteamMeta } from '@/shared/types';

type CheckerState =
  | { status: 'idle' }
  | { status: 'loading'; appId: string }
  | { status: 'error'; appId: string; message: string }
  | { status: 'success'; appId: string; reviewSummary: SteamReviewSummary | null; steamGame: SteamGameDetails };

export function SteamCheckerPage() {
  const { lang, t, unlocked } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(() => parseSteamAppId(searchParams.get('appid') || '') || searchParams.get('appid') || '');
  const [checkerState, setCheckerState] = useState<CheckerState>({ status: 'idle' });
  const latestRequestIdRef = useRef(0);
  const latestAbortControllerRef = useRef<AbortController | null>(null);
  const steamApi = useMemo(() => createSteamApi({ t }), [t]);

  const submitCheck = useCallback(async (rawAppId: string) => {
    latestAbortControllerRef.current?.abort();
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const abortController = new AbortController();
    latestAbortControllerRef.current = abortController;
    const isLatestRequest = () => latestRequestIdRef.current === requestId;
    const appId = parseSteamAppId(rawAppId);
    if (!/^\d+$/.test(appId)) {
      setCheckerState({ status: 'error', appId: rawAppId, message: t('steamchecker.error.invalid') });
      return;
    }

    setInput(appId);
    setCheckerState({ status: 'loading', appId });

    try {
      const [payload, reviewSummary] = await Promise.all([
        steamApi.fetchSteamAppDetails(appId, { signal: abortController.signal }),
        steamApi.fetchSteamReviewSummary(appId, { signal: abortController.signal })
      ]);
      const result = payload[appId];
      if (!result?.success || !result.data) {
        throw new Error(t('steamchecker.error.notfound'));
      }
      if (!isLatestRequest()) return;
      setSearchParams({ appid: appId }, { replace: true });
      setCheckerState({ status: 'success', appId, reviewSummary, steamGame: result.data });
    } catch (nextError) {
      if (!isLatestRequest()) return;
      const message = nextError instanceof Error ? nextError.message : t('steamchecker.error.load');
      setCheckerState({ status: 'error', appId, message });
    }
  }, [setSearchParams, steamApi, t]);

  useEffect(() => {
    const initialAppId = parseSteamAppId(searchParams.get('appid') || '');
    if (!initialAppId || checkerState.status !== 'idle') return;
    void submitCheck(initialAppId);
  }, [checkerState.status, searchParams, submitCheck]);

  if (error) {
    return (
      <main className="page-container steam-checker-page" data-route-ready="steamchecker">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="page-container steam-checker-page" data-route-ready="steamchecker">
        <LoadingState label={t('loading')} />
      </main>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCheck(input);
  };

  return (
    <main className="page-container steam-checker-page" id="steam-checker-page" data-route-ready="steamchecker">
      <section className="steam-checker-hero">
        <div>
          <h1 className="page-title">{t('steamchecker.title')}</h1>
        </div>
      </section>

      <section className="steam-checker-shell">
        <form className="steam-checker-form" onSubmit={handleSubmit}>
          <label className="steam-checker-label" htmlFor="steam-appid-input">{t('steamchecker.appid')}</label>
          <div className="steam-checker-input-row">
            <input
              type="text"
              id="steam-appid-input"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t('steamchecker.appid.placeholder')}
              value={input}
              onChange={event => setInput(event.currentTarget.value)}
            />
            <button className="steam-checker-submit" type="submit">{t('steamchecker.check')}</button>
          </div>
        </form>

        <div className="steam-checker-status" aria-live="polite">
          {checkerState.status === 'idle' ? t('steamchecker.empty') : null}
          {checkerState.status === 'loading' ? t('steamchecker.loading') : null}
          {checkerState.status === 'error' ? checkerState.message : null}
        </div>
        <div className="steam-checker-layout">
          <div className="steam-checker-main">
            <SteamCheckerMain state={checkerState} onRetry={appId => void submitCheck(appId)} t={t} />
          </div>
          <aside className="steam-checker-sidebar">
            {checkerState.status === 'success' ? (
              <SteamCheckerSidebar
                games={data.games}
                lang={lang}
                meta={data.meta}
                reviewSummary={checkerState.reviewSummary}
                steamGame={checkerState.steamGame}
                steamMeta={data.steamMeta}
                unlocked={unlocked}
                appId={checkerState.appId}
                t={t}
              />
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function SteamCheckerMain({ onRetry, state, t }: { onRetry: (appId: string) => void; state: CheckerState; t: (key: string) => string }) {
  if (state.status === 'idle') {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state-title">{t('steamchecker.title')}</div>
        <div className="empty-state-desc">{t('steamchecker.subtitle')}</div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="empty-state fade-in">
        <div className="loading-spinner" />
        <div className="empty-state-title">{t('steamchecker.loading')}</div>
        <div className="empty-state-desc">{state.appId}</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="empty-state fade-in">
        <div className="empty-state-title">{state.message}</div>
        <div className="empty-state-desc">{t('steamchecker.error.load')}</div>
        {parseSteamAppId(state.appId) ? (
          <button className="detail-link-btn empty-retry-btn" type="button" onClick={() => onRetry(state.appId)}>
            {t('steamchecker.retry')}
          </button>
        ) : null}
      </div>
    );
  }

  const authorName = state.steamGame.developers?.[0] || state.steamGame.publishers?.[0] || t('steamchecker.unknown');
  const descriptionRaw = state.steamGame.detailed_description || state.steamGame.about_the_game || '';
  const description = stripHtml(descriptionRaw) || t('detail.noDesc');
  const steamStoreUrl = `https://store.steampowered.com/app/${state.appId}`;

  return (
    <section className="detail-card fade-in steam-result-card">
      <div className="detail-header steam-result-header">
        <div className="steam-result-title-block">
          <div className="detail-title">{state.steamGame.name || t('steamchecker.unknown')}</div>
          <div className="detail-publisher">{authorName}</div>
        </div>
        <div className="steam-result-header-actions">
          <a className="detail-link-btn steam-result-store-btn" href={steamStoreUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="ui-icon" aria-hidden="true" />
            <span>{t('steamchecker.goToStore')}</span>
          </a>
        </div>
      </div>
      <div className="steam-result-description-shell" dangerouslySetInnerHTML={{ __html: renderSteamDescription(description) }} />
    </section>
  );
}

function SteamCheckerSidebar({
  appId,
  games,
  lang,
  meta,
  reviewSummary,
  steamGame,
  steamMeta,
  unlocked,
  t
}: {
  appId: string;
  games: IgrsGame[];
  lang: 'en' | 'id';
  meta: IgrsMeta;
  reviewSummary: SteamReviewSummary | null;
  steamGame: SteamGameDetails;
  steamMeta: SteamMeta;
  unlocked: boolean;
  t: (key: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const steamRating = steamGame.ratings?.igrs || null;
  const generated = parseSteamRatingFlag(steamRating?.rating_generated);
  const localMatch = generated ? findGameByName(games, steamGame.name, fuzzyScoreNormalized) : null;
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
      <article className="rating-card fade-in">
        <div className="rating-card-subtitle rating-card-kicker">{t('steamchecker.reference')}</div>
        {localMatch ? (
          <>
            <div className="rating-card-header">
              <RatingBadge meta={meta} ratingId={referenceRatingId} />
              <div>
                <div className="rating-card-title">{referenceRatingId ? ratingTitle(meta, referenceRatingId, lang) : t('steamchecker.unknown')}</div>
                <div className="rating-card-subtitle">{t('steamchecker.reference')}</div>
              </div>
            </div>
            <DescriptorIcons ids={localMatch.descriptors} emptyLabel={t('detail.noDescriptors')} lang={lang} meta={meta} />
          </>
        ) : (
          <div className="detail-no-descriptors">{t('steamchecker.noLocalRating')}</div>
        )}
      </article>

      <article className="rating-card fade-in">
        <div className="rating-card-subtitle rating-card-kicker">{t('steamchecker.steam')}</div>
        <div className="rating-card-header">
          <RatingBadge meta={meta} ratingId={steamRatingId} />
          <div>
            <div className="rating-card-title">{steamRatingId ? ratingTitle(meta, steamRatingId, lang) : t('steamchecker.noSteamRating')}</div>
            <div className="rating-card-subtitle">{generated ? t('steamchecker.generated') : t('steamchecker.noMatch')}</div>
          </div>
        </div>
        <DescriptorIcons ids={steamRatingDescriptorIds} emptyLabel={t('steamchecker.noDescriptors')} lang={lang} meta={meta} />
      </article>

      <article className="rating-card fade-in steam-comparison-card">
        <div className="rating-card-subtitle rating-card-kicker">{t('steamchecker.comparison')}</div>
        <dl className="steam-comparison-list">
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
          <p className="steam-comparison-note">
            {comparison.missingFromSteamDescriptorIds.map(id => descriptorName(meta, id, lang)).join(', ')}
          </p>
        ) : null}
        {comparison.unexpectedSteamDescriptorIds.length ? (
          <p className="steam-comparison-note">
            {comparison.unexpectedSteamDescriptorIds.map(id => descriptorName(meta, id, lang)).join(', ')}
          </p>
        ) : null}
      </article>

      <SteamReviewSummaryCard reviewSummary={reviewSummary} t={t} lang={lang} />

      <article className="rating-card fade-in">
        <div className="steam-checker-meta">
          {releaseDate ? <div className="steam-checker-meta-row"><strong>{t('steamchecker.release')}:</strong> {releaseDate}</div> : null}
          {supportUrl ? (
            <div className="steam-checker-meta-row">
              <strong>{t('steamchecker.support')}:</strong>{' '}
              <a className="steam-checker-support-link" href={supportUrl.href} target="_blank" rel="noopener noreferrer">{supportUrl.hostname}</a>
            </div>
          ) : null}
        </div>
        <div className="detail-actions steam-actions">
          <button className={`detail-share-btn steam-share-btn${copied ? ' copied' : ''}`} type="button" onClick={copyShareUrl}>
            {copied ? <Check className="ui-icon" aria-hidden="true" /> : <Copy className="ui-icon" aria-hidden="true" />}
            <span>{copied ? t('detail.copied') : t('detail.share')}</span>
          </button>
          <a className="detail-link-btn" href={steamStoreUrl} target="_blank" rel="noopener noreferrer">
            <span>{t('steamchecker.viewSteam')}</span>
          </a>
        </div>
      </article>

      {unlocked ? <article className="rating-card fade-in">
        <div className="rating-card-subtitle rating-card-kicker">{t('steamchecker.ours')}</div>
        <div className="rating-card-header">
          <RatingBadge meta={meta} ratingId={checker.computedRatingId} />
          <div>
            <div className="rating-card-title">{ratingTitle(meta, checker.computedRatingId, lang)}</div>
            <div className="rating-card-subtitle">{t('steamchecker.manual')}</div>
          </div>
        </div>
        <DescriptorIcons ids={checker.mappedDescriptorIds} emptyLabel={t('steamchecker.noManualMapping')} lang={lang} meta={meta} />
        <p className="steam-comparison-note">{t('steamchecker.advancedPublic')}</p>
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

function SteamReviewSummaryCard({
  lang,
  reviewSummary,
  t
}: {
  lang: 'en' | 'id';
  reviewSummary: SteamReviewSummary | null;
  t: (key: string) => string;
}) {
  return (
    <article className="rating-card fade-in steam-review-summary-card">
      <div className="rating-card-subtitle rating-card-kicker">{t('steamchecker.recentReviews')}</div>
      {!reviewSummary ? (
        <div className="detail-no-descriptors">{t('steamchecker.reviewsUnavailable')}</div>
      ) : (
        <>
          <div className="steam-review-score">{reviewSummary.reviewScoreDesc}</div>
          {reviewSummary.positivePercent !== null ? (
            <div className="steam-review-rate">{t('steamchecker.positiveRate').replace('{percent}', String(reviewSummary.positivePercent))}</div>
          ) : null}
          <dl className="steam-review-metrics">
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
