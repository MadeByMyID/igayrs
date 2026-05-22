import { Link } from 'react-router-dom';
import { RATING_ORDER } from '@/core/constants';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { IMG_RATING, platformIdsFromGame, ratingName, ratingTitle } from '@/shared/lib/domain';
import { formatLocalDateTime24 } from '@/shared/lib/format';

export function HomePage() {
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();

  if (error) {
    return (
      <main className="hero" data-route-ready="home">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="hero" data-route-ready="home">
        <LoadingState label={t('loading')} />
      </main>
    );
  }

  const publishers = new Set(data.games.map(game => game.publisherName)).size;
  const platforms = new Set(data.games.flatMap(game => platformIdsFromGame(data.meta, game))).size;
  const updatedAt = formatLocalDateTime24(data.meta.meta?.generatedAt);

  return (
    <main className="hero" data-route-ready="home">
      <div className="hero-content">
        <img src="/assets/data/images/favicon.svg" alt="" className="hero-logo" />
        <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: t('home.title') }} />
        <p className="hero-subtitle">{t('home.subtitle')}</p>

        <div className="hero-stats" id="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">{data.games.length}</span>
            <span className="hero-stat-label">{t('home.stat.games')}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{publishers}</span>
            <span className="hero-stat-label">{t('home.stat.publishers')}</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">{platforms}</span>
            <span className="hero-stat-label">{t('home.stat.platforms')}</span>
          </div>
          <div className="hero-stat hero-stat-wide">
            <span className="hero-stat-num hero-stat-num-updated">{updatedAt}</span>
            <span className="hero-stat-label">{t('home.stat.updated')}</span>
          </div>
        </div>

        <div className="hero-actions">
          <Link to="/search/" className="hero-btn primary">{t('home.cta.search')}</Link>
          <Link to="/ratings/" className="hero-btn secondary">{t('home.cta.ratings')}</Link>
        </div>

        <div className="hero-ratings" id="hero-ratings">
          {RATING_ORDER.filter(id => data.meta.ratings[String(id)]).map(id => (
            <Link to="/ratings/" title={ratingTitle(data.meta, id, lang)} key={id}>
              <img src={IMG_RATING(id)} alt={ratingName(data.meta, id)} loading="lazy" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
