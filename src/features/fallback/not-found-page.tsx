import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/app/providers/language-provider';
import styles from './not-found-page.module.css';

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <main className={`${styles.pageContainer} ${styles.fallbackPage}`} id="fallback-page" data-route-ready="fallback">
      <section className={styles.card} aria-labelledby="fallback-title">
        <div className={styles.icon} aria-hidden="true">
          <AlertTriangle />
        </div>
        <p className={styles.kicker}>404</p>
        <h1 className={styles.pageTitle} id="fallback-title">{t('fallback.notFound.title')}</h1>
        <p className={styles.pageSubtitle}>{t('fallback.notFound.desc')}</p>
        <p className={styles.help}>{t('fallback.notFound.help')}</p>
        <div className={styles.actions} aria-label="Fallback actions">
          <Link to="/search/" className={styles.primaryBtn}>{t('fallback.search')}</Link>
          <Link to="/ratings/" className={styles.secondaryBtn}>{t('fallback.ratings')}</Link>
          <Link to="/" className={styles.linkBtn}>{t('fallback.home')}</Link>
        </div>
      </section>
    </main>
  );
}
