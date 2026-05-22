import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18N } from '@/core/i18n';
import type { Language } from '@/shared/types';

const SECRET_KEY = 'igrs-dev';
const TOGGLE_COUNT_KEY = 'igrs-ltc';
const LANGUAGE_KEY = 'igrs-lang';

interface LanguageContextValue {
  lang: Language;
  setLang: (nextLang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
  unlocked: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'id' ? 'id' : 'en';
}

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.localStorage.getItem(SECRET_KEY) === '1') return true;
  return /(?:^|; )UNLOCKED=true(?:;|$)/.test(document.cookie || '');
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readStoredLanguage);
  const [unlocked, setUnlocked] = useState<boolean>(readUnlocked);

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    window.localStorage.setItem(LANGUAGE_KEY, nextLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLangState(current => {
      const next = current === 'en' ? 'id' : 'en';
      window.localStorage.setItem(LANGUAGE_KEY, next);
      return next;
    });

    const count = Number.parseInt(window.localStorage.getItem(TOGGLE_COUNT_KEY) || '0', 10) + 1;
    window.localStorage.setItem(TOGGLE_COUNT_KEY, String(count));
    if (count >= 28 && !readUnlocked()) {
      window.localStorage.setItem(SECRET_KEY, '1');
      setUnlocked(true);
    }
  }, []);

  const t = useCallback((key: string) => {
    const localized = I18N[lang] as Record<string, string>;
    const fallback = I18N.en as Record<string, string>;
    return localized[key] ?? fallback[key] ?? key;
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.body.classList.add('ready');
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t,
    toggleLanguage,
    unlocked
  }), [lang, setLang, t, toggleLanguage, unlocked]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
