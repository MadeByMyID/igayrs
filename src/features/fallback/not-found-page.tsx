import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/app/providers/language-provider';

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <main className="page-container fallback-page" id="fallback-page" data-route-ready="fallback">
      <section className="fallback-card" aria-labelledby="fallback-title">
        <div className="fallback-icon" aria-hidden="true">
          <AlertTriangle className="ui-icon" />
        </div>
        <p className="fallback-kicker">404</p>
        <h1 className="page-title" id="fallback-title">{t('fallback.notFound.title')}</h1>
        <p className="page-subtitle">{t('fallback.notFound.desc')}</p>
        <p className="fallback-help">{t('fallback.notFound.help')}</p>
        <div className="fallback-actions" aria-label="Fallback actions">
          <Link to="/search/" className="hero-btn primary">{t('fallback.search')}</Link>
          <Link to="/ratings/" className="hero-btn secondary">{t('fallback.ratings')}</Link>
          <Link to="/" className="detail-link-btn">{t('fallback.home')}</Link>
        </div>
      </section>
    </main>
  );
}
