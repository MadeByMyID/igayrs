import { ArrowUp, Copyright, Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '@/app/providers/language-provider';
import { useScrollTopVisibility } from '@/shared/hooks/use-scroll-top';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { lang, t, toggleLanguage } = useLanguage();
  const showScrollTop = useScrollTopVisibility();
  const year = new Date().getUTCFullYear();

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="header-top">
            <NavLink to="/" className="site-logo" aria-label="IGRSDB home">
              <img src="/assets/data/images/favicon.svg" alt="" className="logo-mark" width="36" height="36" />
              <div className="logo-text">IGRS<span>DB</span></div>
            </NavLink>
            <button className="btn header-lang-toggle" type="button" aria-label="Switch language" onClick={toggleLanguage}>
              <Globe className="ui-icon" aria-hidden="true" />
              <span>{lang === 'en' ? 'ID' : 'EN'}</span>
            </button>
          </div>
          <nav className="header-actions" aria-label="Primary navigation">
            <NavLink to="/search/" className="btn">{t('nav.search')}</NavLink>
            <NavLink to="/ratings/" className="btn">{t('nav.ratings')}</NavLink>
            <NavLink to="/steamchecker/" className="btn">{t('nav.steamchecker')}</NavLink>
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
      </footer>

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
