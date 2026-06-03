import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { I18N } from '@/core/i18n';
import { createI18nLoader } from '@/core/i18n-loader';
import { LANGUAGES } from '@/core/i18n-types';
import type { Language } from '@/shared/types';
import { createRateLimiter } from '@/shared/lib/rate-limiter';
import { readLocalStorage, writeLocalStorage } from '@/shared/lib/browser-storage';

const SECRET_KEY = 'igrs-dev';
const TOGGLE_COUNT_KEY = 'igrs-ltc';
const LANGUAGE_KEY = 'igrs-lang';

interface LanguageContextValue {
  lang: Language;
  setLang: (nextLang: Language) => void;
  t: (key: string) => string;
  toggleLanguage: () => void;
  unlocked: boolean;
  dictionaryLoading: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Singleton loader instance — caches loaded dictionaries
const i18nLoader = createI18nLoader();

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return readLocalStorage(LANGUAGE_KEY) === 'id' ? 'id' : 'en';
}

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  if (readLocalStorage(SECRET_KEY) === '1') return true;
  return /(?:^|; )UNLOCKED=true(?:;|$)/.test(document.cookie || '');
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readStoredLanguage);
  const [unlocked, setUnlocked] = useState<boolean>(readUnlocked);
  const [dictionary, setDictionary] = useState<Record<string, string>>(
    I18N.en as Record<string, string>
  );
  const [dictionaryLoading, setDictionaryLoading] = useState<boolean>(() => readStoredLanguage() !== 'en');

  // Rate limiter: max 5 unlock toggle attempts per 60-second sliding window
  const unlockLimiterRef = useRef(createRateLimiter(5, 60_000));

  // Load dictionary when language changes
  useEffect(() => {
    let cancelled = false;

    if (lang === 'en') {
      setDictionary(I18N.en as Record<string, string>);
      setDictionaryLoading(false);
      return;
    }

    setDictionaryLoading(true);
    i18nLoader.loadDictionary(lang).then(dict => {
      if (!cancelled) {
        setDictionary(dict);
        setDictionaryLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [lang]);

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang);
    writeLocalStorage(LANGUAGE_KEY, nextLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLangState(current => {
      const next = current === 'en' ? 'id' : 'en';
      writeLocalStorage(LANGUAGE_KEY, next);
      return next;
    });

    // Rate-limit the unlock counting to prevent brute-force attempts
    if (!unlockLimiterRef.current.attempt()) {
      return;
    }

    const count = Number.parseInt(readLocalStorage(TOGGLE_COUNT_KEY) || '0', 10) + 1;
    writeLocalStorage(TOGGLE_COUNT_KEY, String(count));
    if (count >= 28 && !readUnlocked()) {
      writeLocalStorage(SECRET_KEY, '1');
      setUnlocked(true);
    }
  }, []);

  const t = useCallback((key: string) => {
    const fallback = I18N.en as Record<string, string>;
    return dictionary[key] ?? fallback[key] ?? key;
  }, [dictionary]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES[lang].dir;
    document.body.classList.add('ready');
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t,
    toggleLanguage,
    unlocked,
    dictionaryLoading,
  }), [lang, setLang, t, toggleLanguage, unlocked, dictionaryLoading]);

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
