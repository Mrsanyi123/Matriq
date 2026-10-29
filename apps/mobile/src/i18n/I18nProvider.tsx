import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryKeys, STALE_TIME, type KeyValueStorage } from '@matriq/api-client';
import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import { INTERFACE_LANGUAGES, type InterfaceLanguage } from '@matriq/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { invalidateLearnerData } from '../lib/queries';
import { useSession } from '../lib/session';
import { createAppTranslator, type AppTranslator } from './translate';

export const LANGUAGE_KEY = 'matriq.mobile.language';

export interface I18nValue {
  language: InterfaceLanguage;
  /** BCP 47 tag for Intl formatting. */
  locale: string;
  t: AppTranslator;
  setLanguage(language: InterfaceLanguage): Promise<void>;
  languageSheetOpen: boolean;
  openLanguageSheet(): void;
  closeLanguageSheet(): void;
}

const I18nContext = createContext<I18nValue | null>(null);

const isLanguage = (v: unknown): v is InterfaceLanguage =>
  (INTERFACE_LANGUAGES as readonly unknown[]).includes(v);

/**
 * Interface language. Before sign-in it comes from the device; once a learner
 * (or the demo) is active, their saved preference wins and changes are saved
 * back to it.
 */
export function I18nProvider({
  children,
  storage = AsyncStorage,
  initialLanguage = 'en',
}: {
  children: ReactNode;
  storage?: KeyValueStorage;
  initialLanguage?: InterfaceLanguage;
}) {
  const { api } = useSession();
  const queryClient = useQueryClient();
  const [language, setLocal] = useState<InterfaceLanguage>(initialLanguage);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    storage
      .getItem(LANGUAGE_KEY)
      .then((stored) => {
        if (isLanguage(stored)) setLocal(stored);
      })
      .catch(() => undefined);
  }, [storage]);

  const preferences = useQuery({
    queryKey: api ? queryKeys.preferences(api.mode) : ['matriq', 'none', 'preferences'],
    queryFn: () => api!.getPreferences(),
    enabled: api !== null,
    staleTime: STALE_TIME.learner,
  });
  const preferred = preferences.data?.interfaceLanguage;
  useEffect(() => {
    if (preferred && isLanguage(preferred)) {
      setLocal(preferred);
      storage.setItem(LANGUAGE_KEY, preferred).catch(() => undefined);
    }
  }, [preferred, storage]);

  const setLanguage = useCallback(
    async (next: InterfaceLanguage) => {
      setLocal(next);
      await storage.setItem(LANGUAGE_KEY, next).catch(() => undefined);
      if (api) {
        await api.updatePreferences({ interfaceLanguage: next });
        await invalidateLearnerData(queryClient, api.mode);
      }
    },
    [api, queryClient, storage],
  );

  const value = useMemo<I18nValue>(
    () => ({
      language,
      locale: LANGUAGE_OPTIONS.find((o) => o.code === language)?.locale ?? 'en',
      t: createAppTranslator(language),
      setLanguage,
      languageSheetOpen: sheetOpen,
      openLanguageSheet: () => setSheetOpen(true),
      closeLanguageSheet: () => setSheetOpen(false),
    }),
    [language, setLanguage, sheetOpen],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

export function useT(): AppTranslator {
  return useI18n().t;
}
