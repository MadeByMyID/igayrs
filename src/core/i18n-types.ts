import type { Language } from '@/shared/types';

/**
 * Utility type that enforces a dictionary has exactly the same keys as a base
 * dictionary. If the target is missing a key from Base or has an extra key not
 * in Base, TypeScript will produce a compile error.
 *
 * Applied to both `en` and `id` translation dictionaries so they cannot drift
 * out of sync.
 *
 * @example
 * ```ts
 * const en = { greeting: 'Hello', farewell: 'Bye' } as const;
 * const id: TranslationDictionary<typeof en> = { greeting: 'Halo', farewell: 'Sampai jumpa' };
 * // Missing 'farewell' or adding an unknown key would be a compile error.
 * ```
 */
export type TranslationDictionary<Base extends Record<string, string>> = {
  readonly [K in keyof Base]: string;
};

/**
 * Compile-time assertion that two types have identical key sets.
 * Resolves to `true` when keys match; produces `never` otherwise.
 * Use with a type alias assignment to trigger errors on key mismatch.
 */
export type AssertIdenticalKeys<A, B> =
  keyof A extends keyof B
    ? keyof B extends keyof A
      ? true
      : never
    : never;

/** Text direction for a language — used to set the `dir` attribute on the root HTML element. */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Configuration for a supported language, including its text direction
 * and the path to its external dictionary file.
 */
export interface LanguageConfig {
  /** Language code matching the `Language` union type */
  code: Language;
  /** Human-readable language name */
  name: string;
  /** Text direction — determines the `dir` attribute on `<html>` */
  dir: TextDirection;
  /** Path to the external dictionary JSON file (relative to public root) */
  dictionaryPath: string;
}

/**
 * Registry of all supported languages with their configuration.
 * Adding a new language (including RTL languages like Arabic or Hebrew)
 * only requires adding an entry here with the appropriate `dir` value.
 */
export const LANGUAGES: Record<Language, LanguageConfig> = {
  en: { code: 'en', name: 'English', dir: 'ltr', dictionaryPath: 'assets/i18n/en.json' },
  id: { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr', dictionaryPath: 'assets/i18n/id.json' },
};
