import { Globe, Menu, Moon, Sun, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/app/providers/language-provider';
import { useTheme } from '@/app/providers/theme-provider';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const NAV_LINKS = [
  { to: '/', key: 'nav.home' as const },
  { to: '/search/', key: 'nav.search' as const },
  { to: '/ratings/', key: 'nav.ratings' as const },
  { to: '/steamchecker/', key: 'nav.steamchecker' as const },
] as const;

/**
 * Mobile navigation component with slide-in panel.
 * Visible only below 768px viewport width.
 * Implements focus trap, Escape dismissal, and backdrop click dismissal.
 */
export function MobileNav({ isOpen, onClose, onOpen }: MobileNavProps) {
  const { lang, t, toggleLanguage } = useLanguage();
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close panel on route change
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Focus the close button when panel opens, return focus to trigger on close
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap: cycle Tab/Shift+Tab within the panel
  useEffect(() => {
    if (!isOpen) return;

    function handleFocusTrap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusableElements = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }

    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [isOpen]);

  // Prevent body scroll while panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Hamburger button — visible only below 768px via CSS */}
      <button
        ref={triggerRef}
        className="mobile-nav-trigger"
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        onClick={onOpen}
      >
        <Menu className="ui-icon" aria-hidden="true" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        id="mobile-nav-panel"
        className={`mobile-nav-panel${isOpen ? ' mobile-nav-panel--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!isOpen}
      >
        <div className="mobile-nav-header">
          <span className="mobile-nav-title">Menu</span>
          <button
            ref={closeButtonRef}
            className="mobile-nav-close"
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            <X className="ui-icon" aria-hidden="true" />
          </button>
        </div>

        <nav className="mobile-nav-links" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ to, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `mobile-nav-link${isActive ? ' mobile-nav-link--active' : ''}`
              }
              end={to === '/'}
            >
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="mobile-nav-toggles">
          <button
            className="mobile-nav-toggle-btn"
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {resolvedTheme === 'dark'
              ? <Sun className="ui-icon" aria-hidden="true" />
              : <Moon className="ui-icon" aria-hidden="true" />}
            <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button
            className="mobile-nav-toggle-btn"
            type="button"
            aria-label="Switch language"
            onClick={toggleLanguage}
          >
            <Globe className="ui-icon" aria-hidden="true" />
            <span>{lang === 'en' ? 'Bahasa Indonesia' : 'English'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
