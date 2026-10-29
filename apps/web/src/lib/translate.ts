import {
  LANGUAGE_OPTIONS,
  isMessageKey,
  translate,
  type MessageKey,
  type TranslationValues,
} from '@matriq/i18n';
import type { InterfaceLanguage } from '@matriq/types';
import { extraMessages, type ExtraMessageKey } from './i18n-extra';

export type AppMessageKey = MessageKey | ExtraMessageKey;

function isSharedKey(key: string): key is MessageKey {
  return isMessageKey(key);
}

function isExtraKey(key: string): key is ExtraMessageKey {
  return Object.prototype.hasOwnProperty.call(extraMessages, key);
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Translate a shared key (`@matriq/i18n`, with its English fallback) or a
 * web-only key from `i18n-extra.ts` (English only for now).
 */
export function translateApp(
  language: InterfaceLanguage,
  key: AppMessageKey,
  values?: TranslationValues,
): string {
  if (isExtraKey(key)) return interpolate(extraMessages[key], values);
  return translate(language, key, values);
}

/** True for any key `translateApp` knows. Use for keys built at runtime. */
export function isAppMessageKey(key: string): key is AppMessageKey {
  return isExtraKey(key) || isSharedKey(key);
}

/**
 * Translate a key built at runtime (e.g. `subject.${slug}`), falling back to
 * a server-provided English string when the key is unknown.
 */
export function translateOr(
  language: InterfaceLanguage,
  key: string,
  fallback: string,
  values?: TranslationValues,
): string {
  return isAppMessageKey(key) ? translateApp(language, key, values) : interpolate(fallback, values);
}

export function localeFor(language: InterfaceLanguage): string {
  return LANGUAGE_OPTIONS.find((o) => o.code === language)?.locale ?? 'en';
}

export function createAppTranslator(language: InterfaceLanguage) {
  const t = (key: AppMessageKey, values?: TranslationValues) => translateApp(language, key, values);
  const tOr = (key: string, fallback: string, values?: TranslationValues) =>
    translateOr(language, key, fallback, values);
  return { t, tOr };
}
export type AppTranslator = ReturnType<typeof createAppTranslator>['t'];
