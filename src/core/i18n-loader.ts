import type { Language } from '@/shared/types';
import { I18N } from '@/core/i18n';
import { I18N_BASE } from '@/core/constants';

/**
 * Loads a translation dictionary from `/assets/i18n/{lang}.json`.
 * Falls back to the bundled English dictionary on any failure.
 */
interface I18nLoader {
  loadDictionary(lang: Language): Promise<Record<string, string>>;
}

/**
 * Creates an i18n loader that fetches dictionaries from external JSON files.
 *
 * Loading sequence:
 * 1. If the requested language is English, return the bundled fallback immediately.
 * 2. Otherwise, fetch `/assets/i18n/{lang}.json`.
 * 3. On success, return the parsed dictionary.
 * 4. On failure, log a warning and fall back to the bundled English dictionary.
 */
export function createI18nLoader(dictionaryBase = I18N_BASE): I18nLoader {
  const cache = new Map<Language, Record<string, string>>();
  const normalizedDictionaryBase = dictionaryBase.replace(/\/$/, '');

  return {
    async loadDictionary(lang: Language): Promise<Record<string, string>> {
      // English is always available as a bundled static fallback
      if (lang === 'en') {
        return I18N.en as Record<string, string>;
      }

      // Return cached dictionary if already loaded
      const cached = cache.get(lang);
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(`${normalizedDictionaryBase}/${lang}.json`);

        if (!response.ok) {
          console.warn(
            `[i18n] Failed to load dictionary for "${lang}" (HTTP ${response.status}). Falling back to English.`
          );
          return I18N.en as Record<string, string>;
        }

        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json') && !contentType.includes('text/')) {
          console.warn(
            `[i18n] Unexpected Content-Type "${contentType}" for "${lang}" dictionary. Falling back to English.`
          );
          return I18N.en as Record<string, string>;
        }

        const dictionary = await response.json() as Record<string, string>;

        // Merge with English fallback so missing keys still resolve
        const merged: Record<string, string> = {
          ...(I18N.en as Record<string, string>),
          ...dictionary,
        };

        cache.set(lang, merged);
        return merged;
      } catch (error) {
        console.warn(
          `[i18n] Error loading dictionary for "${lang}". Falling back to English.`,
          error
        );
        return I18N.en as Record<string, string>;
      }
    },
  };
}
