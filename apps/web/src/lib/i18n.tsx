'use client';

import type { InterfaceLanguage } from '@matriq/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANG_COOKIE, setClientCookie } from './cookies';
import { createAppTranslator, localeFor, type AppTranslator } from './translate';

interface I18nValue {
  language: InterfaceLanguage;
  /** BCP 47 locale for `Intl` formatting. */
  locale: string;
  t: AppTranslator;
  tOr: ReturnType<typeof createAppTranslator>['tOr'];
  /** Switches the interface immediately (persisting is the caller's job). */
  setLanguage: (language: InterfaceLanguage) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: InterfaceLanguage;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState(initialLanguage);

  const setLanguage = useCallback((next: InterfaceLanguage) => {
    setLanguageState(next);
    setClientCookie(LANG_COOKIE, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = localeFor(language);
  }, [language]);

  const value = useMemo<I18nValue>(() => {
    const { t, tOr } = createAppTranslator(language);
    return { language, locale: localeFor(language), t, tOr, setLanguage };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
