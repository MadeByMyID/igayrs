import { ArrowUp, Bug, Code, Copyright, Globe, Moon, Sun, Tag } from 'lucide-react';
import { lazy, Suspense, useCallback, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '@/app/providers/language-provider';
import { useTheme } from '@/app/providers/theme-provider';
import { useDataContext } from '@/app/providers/data-provider';
import { FAVICON_URL } from '@/core/constants';
import { ErrorBoundary } from '@/shared/components/error-boundary';
import { MobileNav } from '@/shared/components/mobile-nav';
import { useScrollTopVisibility } from '@/shared/hooks/use-scroll-top';

const LazyChangelogModal = lazy(() => import('@/shared/components/changelog-modal'));

const GITHUB_REPO = 'https://github.com/NatsumeAoii/IGRS2nd';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { lang, t, toggleLanguage } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { ensureData } = useDataContext();
  const showScrollTop = useScrollTopVisibility();
  const [showChangelog, setShowChangelog] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const year = new Date().getUTCFullYear();

  const handleNavHover = useCallback(() => {
    void ensureData().catch(() => undefined);
  }, [ensureData]);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="header-top">
            <NavLink to="/" className="site-logo" aria-label="IGRSDB home">
              <img src={FAVICON_URL} alt="" className="logo-mark" width="36" height="36" />
              <div className="logo-text">IGRS<span>DB</span></div>
            </NavLink>
            <div className="header-toggles">
              <button className="btn header-theme-toggle" type="button" aria-label="Toggle theme" onClick={toggleTheme}>
                {resolvedTheme === 'dark'
                  ? <Sun className="ui-icon" aria-hidden="true" />
                  : <Moon className="ui-icon" aria-hidden="true" />}
              </button>
              <button className="btn header-lang-toggle" type="button" aria-label="Switch language" onClick={toggleLanguage}>
                <Globe className="ui-icon" aria-hidden="true" />
                <span>{lang === 'en' ? 'ID' : 'EN'}</span>
              </button>
            </div>
            <MobileNav
              isOpen={mobileNavOpen}
              onOpen={() => setMobileNavOpen(true)}
              onClose={() => setMobileNavOpen(false)}
            />
          </div>
          <nav className="header-actions" aria-label="Primary navigation">
            <NavLink to="/search/" className="btn" onMouseEnter={handleNavHover}>{t('nav.search')}</NavLink>
            <NavLink to="/ratings/" className="btn" onMouseEnter={handleNavHover}>{t('nav.ratings')}</NavLink>
            <NavLink to="/steamchecker/" className="btn" onMouseEnter={handleNavHover}>{t('nav.steamchecker')}</NavLink>
          </nav>
        </div>
      </header>

      {children}

      <footer className="site-footer">
        <div className="footer-line">
          <span>{t('footer.text')}</span>{' '}
          <a href="https://igrs.id" target="_blank" rel="noopener noreferrer">igrs.id</a>
          <span className="footer-separator" aria-hidden="true">-</span>
          <span className="footer-copyright">
            <Copyright className="ui-icon" aria-hidden="true" />
            <span className="sr-only">Copyright</span>
            <span>{year}</span>
          </span>
          <span>{t('footer.disclaimer')}</span>
        </div>
        <div className="footer-links">
          <a className="footer-link-btn" href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
            <Code className="ui-icon" aria-hidden="true" />
            <span>GitHub</span>
          </a>
          <a className="footer-link-btn" href={`${GITHUB_REPO}/issues/new`} target="_blank" rel="noopener noreferrer" aria-label="Report an issue">
            <Bug className="ui-icon" aria-hidden="true" />
            <span>Report Issue</span>
          </a>
          <button className="footer-link-btn" type="button" onClick={() => setShowChangelog(true)} aria-label="View changelog">
            <Tag className="ui-icon" aria-hidden="true" />
            <span>v{APP_VERSION}</span>
          </button>
        </div>
      </footer>

      {showChangelog && (
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <div className="changelog-overlay" role="alert">
              <div className="changelog-modal changelog-error">
                <p>Failed to load changelog: {error.message}</p>
                <button type="button" onClick={resetError}>Try again</button>
              </div>
            </div>
          )}
        >
          <Suspense fallback={<ChangelogLoadingFallback />}>
            <LazyChangelogModal onClose={() => setShowChangelog(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      <button
        className={`scroll-top${showScrollTop ? ' visible' : ''}`}
        type="button"
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowUp className="ui-icon" aria-hidden="true" />
      </button>
    </>
  );
}

function ChangelogLoadingFallback() {
  return (
    <div className="changelog-overlay" role="status" aria-label="Loading changelog">
      <div className="changelog-modal changelog-loading">
        <span>Loading…</span>
      </div>
    </div>
  );
}
