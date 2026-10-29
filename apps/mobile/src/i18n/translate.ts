import { isMessageKey, translate, type MessageKey, type TranslationValues } from '@matriq/i18n';
import type { InterfaceLanguage } from '@matriq/types';
import { mobileStrings, type MobileMessageKey } from './mobile-strings';

export type AppMessageKey = MessageKey | MobileMessageKey;
export type AppTranslator = (key: AppMessageKey, values?: TranslationValues) => string;

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Shared keys go through @matriq/i18n; mobile-only keys fall back to English. */
export function createAppTranslator(language: InterfaceLanguage): AppTranslator {
  return (key, values) => {
    if (isMessageKey(key)) return translate(language, key, values);
    return interpolate(mobileStrings[key as MobileMessageKey] ?? key, values);
  };
}

/** Translate a key that arrives from data (e.g. `rec.startChapter`), if known. */
export function translateDynamic(
  t: AppTranslator,
  key: string,
  fallback: string,
  values?: TranslationValues,
): string {
  if (isMessageKey(key) || key in mobileStrings) return t(key as AppMessageKey, values);
  return fallback;
}
