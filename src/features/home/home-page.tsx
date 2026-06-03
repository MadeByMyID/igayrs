import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FAVICON_URL, RATING_ORDER } from '@/core/constants';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { IMG_RATING, IMG_RATING_WEBP, ratingIdsFromGame, ratingName, ratingTitle } from '@/shared/lib/ratings';
import { formatLocalDateTime24 } from '@/shared/lib/format';
import { useRecentlyViewed } from '@/shared/hooks/use-recently-viewed';
import type { IgrsGame, IgrsMeta } from '@/shared/types';
import styles from './home-page.module.css';

export function HomePage() {
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();
  const recentIds = useRecentlyViewed();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/search/?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/search/');
    }
  }, [searchQuery, navigate]);

  // "/" keyboard shortcut to focus search input on desktop
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !e.ctrlKey && !e.metaKey && !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (error) {
    return (
      <main className={styles.hero} data-route-ready="home">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className={styles.hero} data-route-ready="home">
        <LoadingState label={t('loading')} />
      </main>
    );
  }

  const publishers = data.stats.publisherCount;
  const platforms = data.stats.platformCount;
  const updatedAt = formatLocalDateTime24(data.meta.meta?.generatedAt);
  const recentGames = recentIds
    .map(id => data.gamesById.get(id))
    .filter((g): g is IgrsGame => g !== undefined)
    .slice(0, 6);

  return (
    <main className={styles.hero} data-route-ready="home">
      <div className={styles.heroContent}>
        <img src={FAVICON_URL} alt="" className={styles.heroLogo} width={260} height={260} />
        <h1 className={styles.heroTitle}>
          {t('home.title.prefix')}
          <span className={styles.heroTitleAccent}>{t('home.title.accent')}</span>
          {t('home.title.suffix')}
          <br />
          {t('home.title.bottom')}
        </h1>
        <p className={styles.heroSubtitle}>{t('home.subtitle')}</p>

        <form className={styles.quickSearch} onSubmit={handleSearchSubmit} role="search">
          <Search size={18} className={styles.quickSearchIcon} aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            className={styles.quickSearchInput}
            placeholder={t('home.cta.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label={lang === 'id' ? 'Cari game berdasarkan judul' : 'Search games by title'}
          />
          <kbd className={styles.quickSearchKbd}>/</kbd>
        </form>

        <div className={styles.heroStats} id="hero-stats">
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>{data.games.length}</span>
            <span className={styles.heroStatLabel}>{t('home.stat.games')}</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>{publishers}</span>
            <span className={styles.heroStatLabel}>{t('home.stat.publishers')}</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>{platforms}</span>
            <span className={styles.heroStatLabel}>{t('home.stat.platforms')}</span>
          </div>
          <div className={`${styles.heroStat} ${styles.heroStatWide}`}>
            <span className={`${styles.heroStatNum} ${styles.heroStatNumUpdated}`}>{updatedAt}</span>
            <span className={styles.heroStatLabel}>{t('home.stat.updated')}</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          <Link to="/search/" className={styles.heroBtnPrimary}>{t('home.cta.search')}</Link>
          <Link to="/ratings/" className={styles.heroBtnSecondary}>{t('home.cta.ratings')}</Link>
        </div>

        <div className={styles.heroRatings} id="hero-ratings">
          {RATING_ORDER.filter(id => data.meta.ratings[String(id)]).map(id => (
            <Link to="/ratings/" title={ratingTitle(data.meta, id, lang)} key={id}>
              <picture>
                <source srcSet={IMG_RATING_WEBP(id)} type="image/webp" />
                <img src={IMG_RATING(id)} alt={ratingName(data.meta, id)} width={56} height={56} loading="lazy" />
              </picture>
            </Link>
          ))}
        </div>

        {recentGames.length > 0 ? (
          <RecentlyViewedSection games={recentGames} meta={data.meta} lang={lang} />
        ) : null}
      </div>
    </main>
  );
}

function RecentlyViewedSection({ games, meta, lang }: { games: IgrsGame[]; meta: IgrsMeta; lang: 'en' | 'id' }) {
  return (
    <div className={styles.recentlyViewedSection}>
      <div className={styles.recentlyViewedLabel}>{lang === 'id' ? 'Terakhir Dilihat' : 'Recently Viewed'}</div>
      <div className={styles.recentlyViewedList}>
        {games.map(game => {
          const ratingId = ratingIdsFromGame(game)[0] || null;
          return (
            <Link to={`/game/${game.id}`} className={styles.recentlyViewedItem} key={game.id}>
              <span className={styles.recentlyViewedName}>{game.name}</span>
              <span className={styles.recentlyViewedYear}>{game.releaseYear}</span>
              {ratingId ? <span className={styles.ratingBadge} data-rating={ratingId}>{ratingName(meta, ratingId)}</span> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
