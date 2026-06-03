import { ExternalLink } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { renderSteamDescription } from '@/core/steam-description';
import { safeHttpUrl } from '@/core/safe-render';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { createSteamApi } from '@/shared/api/steam-api';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { isAbortError } from '@/shared/lib/abort';
import { parseSteamAppId } from '@/shared/lib/steam-domain';
import { sanitizeHtml, stripHtml } from '@/shared/lib/html';
import { SteamCheckerSidebar } from '@/features/steam-checker/steam-checker-sidebar';
import styles from './steam-checker-page.module.css';
import type { SteamGameDetails, SteamReviewSummary } from '@/shared/types';

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
  const lastSubmittedAppIdRef = useRef<string>('');
  const steamApi = useMemo(() => createSteamApi({ t }), [t]);

  const submitCheck = useCallback(async (rawAppId: string, options?: { updateUrl?: boolean }) => {
    const shouldUpdateUrl = options?.updateUrl ?? true;
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
      lastSubmittedAppIdRef.current = appId;
      if (shouldUpdateUrl) {
        setSearchParams({ appid: appId }, { replace: false });
      }
      setCheckerState({ status: 'success', appId, reviewSummary, steamGame: result.data });
    } catch (nextError) {
      if (isAbortError(nextError)) return;
      if (!isLatestRequest()) return;
      const message = nextError instanceof Error ? nextError.message : t('steamchecker.error.load');
      setCheckerState({ status: 'error', appId, message });
    }
  }, [setSearchParams, steamApi, t]);

  // Auto-initiate lookup on page load or when URL changes (back/forward navigation)
  useEffect(() => {
    const urlAppId = parseSteamAppId(searchParams.get('appid') || '');
    if (!urlAppId) {
      // URL has no appid — reset to idle if we were showing results from a previous lookup
      if (checkerState.status !== 'idle') {
        setCheckerState({ status: 'idle' });
        setInput('');
        lastSubmittedAppIdRef.current = '';
      }
      return;
    }
    // Only re-fetch if the URL app ID differs from what we last submitted
    if (urlAppId === lastSubmittedAppIdRef.current) return;
    void submitCheck(urlAppId, { updateUrl: false });
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abort any in-flight request on unmount to prevent memory leaks
  useEffect(() => {
    return () => { latestAbortControllerRef.current?.abort(); };
  }, []);

  if (error) {
    return (
      <main className={`${styles.pageContainer} ${styles.steamCheckerPage}`} data-route-ready="steamchecker">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className={`${styles.pageContainer} ${styles.steamCheckerPage}`} data-route-ready="steamchecker">
        <LoadingState label={t('loading')} />
      </main>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCheck(input);
  };

  return (
    <main className={`${styles.pageContainer} ${styles.steamCheckerPage}`} id="steam-checker-page" data-route-ready="steamchecker">
      <section className={styles.hero}>
        <div>
          <h1 className={styles.pageTitle}>{t('steamchecker.title')}</h1>
        </div>
      </section>

      <section className={styles.shell}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="steam-appid-input">{t('steamchecker.appid')}</label>
          <div className={styles.inputRow}>
            <input
              type="text"
              id="steam-appid-input"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t('steamchecker.appid.placeholder')}
              value={input}
              onChange={event => setInput(event.currentTarget.value)}
            />
            <button className={styles.submitButton} type="submit">{t('steamchecker.check')}</button>
          </div>
        </form>

        <div className={styles.status} aria-live="polite">
          {checkerState.status === 'idle' ? t('steamchecker.empty') : null}
          {checkerState.status === 'loading' ? t('steamchecker.loading') : null}
          {checkerState.status === 'error' ? checkerState.message : null}
        </div>
        <div className={styles.layout}>
          <div className={styles.main}>
            <SteamCheckerMain state={checkerState} onRetry={appId => void submitCheck(appId)} t={t} />
          </div>
          <aside className={styles.sidebar}>
            {checkerState.status === 'success' ? (
              <SteamCheckerSidebar
                games={data.games}
                gamesByNormalizedName={data.gamesByNormalizedName}
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
      <div className={`${styles.emptyState} ${styles.fadeIn}`}>
        <div className={styles.emptyStateTitle}>{t('steamchecker.title')}</div>
        <div className={styles.emptyStateDesc}>{t('steamchecker.subtitle')}</div>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className={`${styles.emptyState} ${styles.fadeIn}`}>
        <div className={styles.loadingSpinner} />
        <div className={styles.emptyStateTitle}>{t('steamchecker.loading')}</div>
        <div className={styles.emptyStateDesc}>{state.appId}</div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`${styles.emptyState} ${styles.fadeIn}`}>
        <div className={styles.emptyStateTitle}>{state.message}</div>
        <div className={styles.emptyStateDesc}>{t('steamchecker.error.load')}</div>
        {parseSteamAppId(state.appId) ? (
          <button className={`detail-link-btn ${styles.emptyRetryBtn}`} type="button" onClick={() => onRetry(state.appId)}>
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
  const headerImageUrl = safeHttpUrl(state.steamGame.header_image || '');

  return (
    <section className={`detail-card ${styles.fadeIn} ${styles.resultCard}`}>
      {headerImageUrl ? (
        <img src={headerImageUrl.href} alt="" loading="lazy" />
      ) : null}
      <div className={`detail-header ${styles.resultHeader}`}>
        <div className={styles.resultTitleBlock}>
          <div className="detail-title">{state.steamGame.name || t('steamchecker.unknown')}</div>
          <div className="detail-publisher">{authorName}</div>
        </div>
        <div className={styles.resultHeaderActions}>
          <a className={`detail-link-btn ${styles.resultStoreBtn}`} href={steamStoreUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={styles.icon} aria-hidden="true" />
            <span>{t('steamchecker.goToStore')}</span>
          </a>
          <a className={`detail-link-btn ${styles.resultStoreBtn}`} href={`https://steamdb.info/app/${state.appId}/`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className={styles.icon} aria-hidden="true" />
            <span>SteamDB</span>
          </a>
        </div>
      </div>
      <div className={styles.resultDescriptionShell} dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderSteamDescription(description)) }} />
    </section>
  );
}
