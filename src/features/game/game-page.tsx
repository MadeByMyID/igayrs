import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { createSteamApi } from '@/shared/api/steam-api';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { GameDetailView } from '@/shared/components/game-detail-view';
import { recordRecentlyViewed } from '@/shared/hooks/use-recently-viewed';
import { useSteamMatch } from '@/shared/hooks/use-steam-match';
import styles from './game-page.module.css';

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();
  const navigate = useNavigate();

  // Use useState with lazy initializer so the Steam API instance (and its
  // internal LRU cache) is created exactly once and persists across re-renders.
  const [steamApi] = useState(() => createSteamApi({ t }));

  const gameId = Number(id);
  const game = data?.gamesById.get(gameId) || null;
  const steamMatch = useSteamMatch(game, steamApi.findSteamMatchForGame);

  useEffect(() => {
    if (game) recordRecentlyViewed(game.id);
  }, [game]);

  if (error) {
    return (
      <main className={styles.pageContainer} data-route-ready="game">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className={styles.pageContainer} data-route-ready="game">
        <LoadingState label={t('loading')} />
      </main>
    );
  }

  if (!game) {
    return (
      <main className={styles.pageContainer} data-route-ready="game">
        <div className={`${styles.emptyState} ${styles.fadeIn}`}>
          <div className={styles.emptyStateTitle}>{t('fallback.notFound.title')}</div>
          <div className={styles.emptyStateDesc}>Game ID {id} was not found in the database.</div>
          <Link className={styles.searchLink} to="/search/">
            {t('fallback.search')}
          </Link>
        </div>
      </main>
    );
  }

  const handleBack = () => {
    // If user arrived directly (shared link), go to search instead of exiting the app
    if (window.history.length <= 2) {
      navigate('/search/', { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <main className={styles.pageContainer} data-route-ready="game">
      <button className={styles.backButton} type="button" onClick={handleBack}>
        <ChevronLeft className={styles.icon} aria-hidden="true" />
        {t('detail.back')}
      </button>
      <GameDetailView allGames={data.games} game={game} lang={lang} meta={data.meta} steamMatch={steamMatch} t={t} />
    </main>
  );
}
