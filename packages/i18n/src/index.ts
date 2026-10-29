/**
 * Interface translations (English, Amharic, Afaan Oromoo).
 *
 * Only the interface is translated. Academic content (lessons, questions,
 * explanations) stays in English and should be rendered with `lang="en"` so
 * screen readers pronounce it correctly.
 */
import type { InterfaceLanguage } from '@matriq/types';
import { am } from './locales/am';
import { en } from './locales/en';
import type { MessageKey, Messages } from './locales/en-types';
import { om } from './locales/om';

export type { MessageKey, Messages };

const dictionaries: Record<InterfaceLanguage, Messages> = { en, am, om };

export type TranslationValues = Record<string, string | number>;

/** Translate `key`, interpolating `{name}` placeholders. Falls back to English. */
export function translate(
  language: InterfaceLanguage,
  key: MessageKey,
  values?: TranslationValues,
): string {
  const template = dictionaries[language][key] ?? en[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Bind a language once, e.g. `const t = createTranslator('am')`. */
export function createTranslator(language: InterfaceLanguage) {
  return (key: MessageKey, values?: TranslationValues) => translate(language, key, values);
}
export type Translator = ReturnType<typeof createTranslator>;

/** True if `key` is a known message key (useful for keys built at runtime). */
export function isMessageKey(key: string): key is MessageKey {
  return key in en;
}

export const LANGUAGE_OPTIONS: readonly {
  code: InterfaceLanguage;
  /** Name in its own language. */
  nativeName: string;
  englishName: string;
  /** Short label for the compact language button. */
  short: string;
  /** BCP 47 tag for `lang` attributes and Intl formatting. */
  locale: string;
}[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', short: 'EN', locale: 'en' },
  { code: 'am', nativeName: 'አማርኛ', englishName: 'Amharic', short: 'አማ', locale: 'am' },
  { code: 'om', nativeName: 'Afaan Oromoo', englishName: 'Oromo', short: 'OM', locale: 'om' },
];

/** Keys present in English but missing from a locale (for review tooling). */
export function missingKeys(language: InterfaceLanguage): MessageKey[] {
  return (Object.keys(en) as MessageKey[]).filter((k) => !(k in dictionaries[language]));
}
