'use client';

import { LANGUAGE_OPTIONS } from '@matriq/i18n';
import type { InterfaceLanguage } from '@matriq/types';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import { useApiContext } from '@/lib/api';
import { learnerDataKeys } from '@matriq/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Sheet, SheetOption } from './ui/sheet';

/**
 * Switches the interface language immediately and, when `persist` is set,
 * saves it to the student's preferences.
 */
export function useChangeLanguage(persist: boolean) {
  const { setLanguage } = useI18n();
  const { api } = useApiContext();
  const queryClient = useQueryClient();
  return async (language: InterfaceLanguage) => {
    setLanguage(language);
    if (!persist || !api) return;
    try {
      await api.updatePreferences({ interfaceLanguage: language });
      await Promise.all(
        learnerDataKeys(api.mode).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    } catch {
      // The interface already switched; the preference is retried next time.
    }
  };
}

export function LanguageOptions({ persist, onDone }: { persist: boolean; onDone?: () => void }) {
  const { language, t } = useI18n();
  const change = useChangeLanguage(persist);
  return (
    <div role="radiogroup" aria-label={t('appLanguage')}>
      {LANGUAGE_OPTIONS.map((option) => (
        <SheetOption
          key={option.code}
          selected={language === option.code}
          onClick={() => {
            void change(option.code);
            onDone?.();
          }}
        >
          <span lang={option.locale} className="block font-bold">
            {option.nativeName}
          </span>
          <small lang="en" className="block text-caption font-normal text-muted">
            {option.englishName}
          </small>
        </SheetOption>
      ))}
    </div>
  );
}

/** Globe + short code button (prototype .lang-btn) that opens the language sheet. */
export function LanguageButton({ persist = true, className }: { persist?: boolean; className?: string }) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);
  const short = LANGUAGE_OPTIONS.find((o) => o.code === language)?.short ?? 'EN';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('appLanguage')}
        aria-haspopup="dialog"
        className={cn(
          'flex h-11 min-w-[49px] items-center justify-center gap-[5px] rounded-md border border-line bg-paper px-2.5 text-xs font-extrabold',
          className,
        )}
      >
        <Globe className="size-[17px]" strokeWidth={1.9} aria-hidden="true" />
        <span>{short}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t('appLanguage')} description={t('englishOnly')}>
        <LanguageOptions persist={persist} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
